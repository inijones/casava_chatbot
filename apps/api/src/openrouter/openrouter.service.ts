import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfig, APP_CONFIG } from '../config';
import { eventsFromSseLine, toVectorLiteral } from './sse';

type ChatTurn = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async embedText(text: string): Promise<number[]> {
    const [vector] = await this.embedTexts([text]);
    return vector;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: texts,
        dimensions: this.config.embeddingDimensions,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      this.logger.error(`Embeddings request failed with HTTP ${response.status}.`);
      throw new Error('Embeddings request failed.');
    }

    const payload = (await response.json()) as {
      data?: Array<{ index: number; embedding: number[] }>;
    };
    const vectors = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
    if (vectors.length !== texts.length) {
      throw new Error('The embedding response did not match the input.');
    }

    return vectors.map((item) => {
      toVectorLiteral(item.embedding, this.config.embeddingDimensions);
      return item.embedding;
    });
  }

  async *streamChat(messages: ChatTurn[], signal: AbortSignal): AsyncGenerator<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.chatModel,
        messages,
        stream: true,
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      this.logger.error(`Chat request failed with HTTP ${response.status}.`);
      throw new Error('Chat request failed.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        for (const event of eventsFromSseLine(line)) {
          if (event.type === 'error') {
            this.logger.error('The model stream reported an error.');
            throw new Error('The model stream failed.');
          }
          if (event.type === 'token') yield event.token;
          if (event.type === 'done') return;
        }
      }
    }
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.config.appUrl,
      'X-Title': 'Casava Business Gro Assistant',
    };
  }
}
