CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_title TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  embedding VECTOR(1536) NOT NULL,
  retrieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX knowledge_chunks_category_idx
  ON knowledge_chunks(category);

CREATE INDEX messages_conversation_created_idx
  ON messages(conversation_id, created_at, id);

-- Exact nearest-neighbour search is enough for this small reviewed corpus.
-- Add an HNSW or IVFFlat index only after the operator class matches the
-- query distance operator and there is enough data to justify it.
