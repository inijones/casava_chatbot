import { Module } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import { DatabaseModule } from '../database/database.module';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationsService, KnowledgeService, OpenRouterService],
})
export class ChatModule {}
