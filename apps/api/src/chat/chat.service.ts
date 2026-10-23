import {
  BadGatewayException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { AppConfig, APP_CONFIG } from '../config';
import { ConversationsService, StoredSource } from '../conversations/conversations.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { publicMessage } from '../common/all-exceptions.filter';
import { ChatRequestDto } from './chat.dto';
import { generateAnswer, RetrievedChunk } from './prompt';
import { redactSensitive } from './redact';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly conversations: ConversationsService,
    private readonly knowledge: KnowledgeService,
    private readonly openRouter: OpenRouterService,
  ) {}

  async streamAnswer(dto: ChatRequestDto, res: Response): Promise<void> {
    if (!this.config.openRouterApiKey || !this.config.chatModel) {
      throw new ServiceUnavailableException(
        'The assistant is not configured yet. Add the OpenRouter key and chat model on the server.',
      );
    }

    const conversationId = dto.conversationId ?? randomUUID();
    const redacted = redactSensitive(dto.message);
    let totalChunks = 0;
    let chunks: RetrievedChunk[] = [];
    try {
      totalChunks = await this.knowledge.count();
      if (totalChunks > 0) {
        const vector = await this.openRouter.embedText(redacted.text);
        chunks = await this.knowledge.retrieveChunks(vector);
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Retrieval failed');
      throw new BadGatewayException(
        'The assistant could not look up sources just now. Please try again.',
      );
    }

    await this.conversations.ensure(conversationId);
    await this.conversations.saveMessage(conversationId, 'user', redacted.text, null);
    const history = await this.conversations.recent(conversationId, this.config.historyLimit);
    const messages = this.generateAnswer(redacted.text, history, chunks, totalChunks === 0);
    const sources = uniqueSources(chunks);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    writeEvent(res, { conversationId });
    if (redacted.redacted) {
      writeEvent(res, {
        notice:
          'A long number was removed from your message. Please do not send ID, card, or account numbers here.',
      });
    }
    writeEvent(res, { sources });

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 60_000);
    let finished = false;
    const onClose = () => {
      if (!finished) abort.abort();
    };
    res.on('close', onClose);

    let answer = '';
    let saved = false;
    const persist = async () => {
      if (!answer.trim() || saved) return;
      await this.conversations.saveMessage(conversationId, 'assistant', answer, sources);
      saved = true;
    };
    try {
      for await (const token of this.openRouter.streamChat(messages, abort.signal)) {
        answer += token;
        writeEvent(res, { token });
      }
      if (!answer.trim()) {
        writeEvent(res, { error: 'The assistant did not return a reply. Please try again.' });
      } else {
        await persist();
        writeEvent(res, { done: true });
      }
    } catch (error) {
      await persist();
      this.logger.error(error instanceof Error ? error.message : 'Stream failed');
      if (!finished && !res.writableEnded) {
        writeEvent(res, { error: 'The reply was interrupted. Please try again.' });
      }
    } finally {
      finished = true;
      clearTimeout(timeout);
      res.off('close', onClose);
      if (!res.writableEnded) res.end();
    }
  }

  private generateAnswer(
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    chunks: RetrievedChunk[],
    knowledgeEmpty: boolean,
  ) {
    return generateAnswer(question, history, chunks, { knowledgeEmpty });
  }
}

export function writeEvent(res: Response, payload: Record<string, unknown>): void {
  if (res.writableEnded || res.destroyed) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function uniqueSources(chunks: RetrievedChunk[]): StoredSource[] {
  const seen = new Set<string>();
  const sources: StoredSource[] = [];
  for (const chunk of chunks) {
    if (!chunk.sourceUrl.startsWith('https://') || seen.has(chunk.sourceUrl)) continue;
    seen.add(chunk.sourceUrl);
    sources.push({
      sourceUrl: chunk.sourceUrl,
      sourceTitle: chunk.sourceTitle,
      category: chunk.category,
    });
  }
  return sources;
}

export function clientError(error: unknown): { status: number; message: string } {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    return { status, message: publicMessage(error, status) };
  }
  return { status: 500, message: 'Something went wrong. Please try again.' };
}
