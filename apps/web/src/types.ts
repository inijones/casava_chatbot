export type Source = {
  sourceUrl: string;
  sourceTitle: string | null;
  category: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  pending?: boolean;
};

export type HealthStatus = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  pgvector: boolean;
  knowledgeChunks: number;
  chatConfigured: boolean;
  embeddingConfigured: boolean;
};

export type ServerEvent = {
  conversationId?: string;
  token?: string;
  done?: boolean;
  error?: string;
  notice?: string;
  sources?: Source[];
};
