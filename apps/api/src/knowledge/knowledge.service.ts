import { Inject, Injectable } from '@nestjs/common';
import { AppConfig, APP_CONFIG } from '../config';
import { DatabaseService } from '../database/database.service';
import { RetrievedChunk } from '../chat/prompt';
import { toVectorLiteral } from '../openrouter/sse';

type ChunkRow = {
  source_url: string;
  source_title: string | null;
  category: string;
  content: string;
  distance: number;
};

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async count(): Promise<number> {
    const result = await this.database.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM knowledge_chunks',
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async retrieveChunks(queryVector: number[]): Promise<RetrievedChunk[]> {
    const literal = toVectorLiteral(queryVector, this.config.embeddingDimensions);
    const result = await this.database.query<ChunkRow>(
      `SELECT source_url, source_title, category, content,
              embedding <=> $1::vector AS distance
       FROM knowledge_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [literal, this.config.retrievalLimit],
    );

    return result.rows
      .filter((row) => Number(row.distance) <= this.config.retrievalMaxDistance)
      .map((row) => ({
        sourceUrl: row.source_url,
        sourceTitle: row.source_title,
        category: row.category,
        content: row.content,
        distance: Number(row.distance),
      }));
  }
}
