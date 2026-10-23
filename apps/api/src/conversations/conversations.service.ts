import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type StoredSource = {
  sourceUrl: string;
  sourceTitle: string | null;
  category: string;
};

export type StoredMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources: StoredSource[];
};

@Injectable()
export class ConversationsService {
  constructor(private readonly database: DatabaseService) {}

  async ensure(conversationId: string): Promise<void> {
    await this.database.query(
      `INSERT INTO conversations (id)
       VALUES ($1)
       ON CONFLICT (id) DO NOTHING`,
      [conversationId],
    );
  }

  async exists(conversationId: string): Promise<boolean> {
    const result = await this.database.query(
      'SELECT 1 FROM conversations WHERE id = $1',
      [conversationId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    sources: StoredSource[] | null,
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO messages (conversation_id, role, content, sources)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [conversationId, role, content, sources ? JSON.stringify(sources) : null],
    );
    await this.database.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId],
    );
  }

  async recent(conversationId: string, limit: number): Promise<StoredMessage[]> {
    const result = await this.database.query<{
      role: 'user' | 'assistant';
      content: string;
      sources: StoredSource[] | null;
    }>(
      `SELECT role, content, sources
       FROM (
         SELECT role, content, sources, created_at, id
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2
       ) recent
       ORDER BY created_at ASC, id ASC`,
      [conversationId, limit],
    );
    return result.rows.map(normalizeMessage);
  }

  async list(conversationId: string): Promise<StoredMessage[]> {
    const result = await this.database.query<{
      role: 'user' | 'assistant';
      content: string;
      sources: StoredSource[] | null;
    }>(
      `SELECT role, content, sources
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [conversationId],
    );
    return result.rows.map(normalizeMessage);
  }
}

function normalizeMessage(row: {
  role: 'user' | 'assistant';
  content: string;
  sources: StoredSource[] | null;
}): StoredMessage {
  return {
    role: row.role,
    content: row.content,
    sources: Array.isArray(row.sources) ? row.sources : [],
  };
}
