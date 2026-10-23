import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatRequestDto } from './chat.dto';
import { ChatService, clientError } from './chat.service';

@Controller()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chat: ChatService,
    private readonly conversations: ConversationsService,
  ) {}

  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async chatStream(@Body() dto: ChatRequestDto, @Res() res: Response): Promise<void> {
    try {
      await this.chat.streamAnswer(dto, res);
    } catch (error) {
      if (res.headersSent) {
        this.logger.error(error instanceof Error ? error.message : 'Chat failed after headers');
        return;
      }
      const { status, message } = clientError(error);
      res.status(status).json({ statusCode: status, message });
    }
  }

  @Get('conversations/:id')
  @SkipThrottle()
  async conversation(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const exists = await this.conversations.exists(id);
    if (!exists) {
      throw new NotFoundException('That conversation was not found.');
    }
    const messages = await this.conversations.list(id);
    return { conversationId: id, messages };
  }
}
