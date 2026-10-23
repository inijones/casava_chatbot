import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppConfig, APP_CONFIG } from '../config';
import { DatabaseService } from '../database/database.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  async health(@Res({ passthrough: true }) res: Response) {
    let database: 'up' | 'down' = 'down';
    let pgvector = false;
    let knowledgeChunks = 0;

    try {
      await this.database.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }

    if (database === 'up') {
      try {
        const extension = await this.database.query(
          "SELECT extname FROM pg_extension WHERE extname = 'vector'",
        );
        pgvector = (extension.rowCount ?? 0) > 0;
      } catch {
        pgvector = false;
      }
      try {
        const count = await this.database.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM knowledge_chunks',
        );
        knowledgeChunks = Number(count.rows[0]?.count ?? 0);
      } catch {
        knowledgeChunks = 0;
      }
    }

    if (database === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: database === 'up' && pgvector ? 'ok' : 'degraded',
      database,
      pgvector,
      knowledgeChunks,
      chatConfigured: Boolean(this.config.openRouterApiKey && this.config.chatModel),
      embeddingConfigured: Boolean(this.config.openRouterApiKey && this.config.embeddingModel),
      embeddingDimensions: this.config.embeddingDimensions,
    };
  }
}
