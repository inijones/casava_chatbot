import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from '../load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv(root);

const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 1536);
const knowledgeDir = path.resolve(root, process.env.KNOWLEDGE_DIR || 'knowledge/reviewed');

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
if (!apiKey) {
  console.error('OPENROUTER_API_KEY is required. Ingestion calls OpenRouter and does not invent vectors.');
  process.exit(1);
}
if (!Number.isInteger(dimensions) || dimensions < 1) {
  console.error('EMBEDDING_DIMENSIONS must be a positive integer.');
  process.exit(1);
}

const file = path.join(knowledgeDir, 'chunks.json');
const chunks = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(chunks) || chunks.length === 0) {
  console.error('knowledge/reviewed/chunks.json must be a non-empty array.');
  process.exit(1);
}

for (const chunk of chunks) {
  for (const key of ['source_url', 'source_title', 'retrieved_at', 'category', 'content']) {
    if (typeof chunk[key] !== 'string' || !chunk[key].trim()) {
      console.error(`Chunk is missing ${key}.`);
      process.exit(1);
    }
  }
  if (!chunk.source_url.startsWith('https://')) {
    console.error(`Source URL must be https: ${chunk.source_url}`);
    process.exit(1);
  }
}

const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
    'X-Title': 'Casava Business Gro Assistant',
  },
  body: JSON.stringify({
    model,
    input: chunks.map((chunk) => chunk.content),
    dimensions,
  }),
});

if (!response.ok) {
  console.error(`OpenRouter embeddings failed with HTTP ${response.status}.`);
  process.exit(1);
}

const payload = await response.json();
const vectors = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
if (vectors.length !== chunks.length) {
  console.error(`Expected ${chunks.length} embeddings, received ${vectors.length}.`);
  process.exit(1);
}

const rows = chunks.map((chunk, index) => {
  const embedding = vectors[index]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== dimensions) {
    console.error(
      `Embedding ${index} length was ${embedding?.length ?? 0}. Expected ${dimensions}. Re-embed every chunk with one model before changing VECTOR(${dimensions}).`,
    );
    process.exit(1);
  }
  if (embedding.some((value) => !Number.isFinite(value))) {
    console.error(`Embedding ${index} contained a non-finite number.`);
    process.exit(1);
  }
  const contentHash = crypto
    .createHash('sha256')
    .update(`${chunk.source_url}\n${chunk.category}\n${chunk.content}`)
    .digest('hex');
  return { chunk, embedding, contentHash };
});

console.log(
  `Embedded ${rows.length} chunks with ${model}. Vector length ${rows[0].embedding.length}.`,
);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('DELETE FROM knowledge_chunks');
  for (const row of rows) {
    await client.query(
      `INSERT INTO knowledge_chunks
        (source_url, source_title, category, content, content_hash, embedding, retrieved_at)
       VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
      [
        row.chunk.source_url,
        row.chunk.source_title,
        row.chunk.category,
        row.chunk.content,
        row.contentHash,
        `[${row.embedding.join(',')}]`,
        row.chunk.retrieved_at,
      ],
    );
  }
  await client.query('COMMIT');
  console.log(`Replaced knowledge_chunks with ${rows.length} reviewed passages.`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error instanceof Error ? error.message : 'Ingestion failed.');
  process.exitCode = 1;
} finally {
  await client.end();
}
