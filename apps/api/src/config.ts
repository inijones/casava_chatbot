import fs from 'node:fs';
import path from 'node:path';

export type AppConfig = {
  databaseUrl: string;
  port: number;
  nodeEnv: string;
  frontendOrigins: string[];
  openRouterApiKey: string;
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
  retrievalLimit: number;
  retrievalMaxDistance: number;
  historyLimit: number;
  appUrl: string;
};

export function envFileCandidates(cwd = process.cwd(), here = __dirname): string[] {
  return [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '../../.env'),
    path.resolve(here, '../../../.env'),
    path.resolve(here, '../../../../.env'),
  ];
}

export function loadLocalEnv(): void {
  for (const file of envFileCandidates()) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function readConfig(env: NodeJS.ProcessEnv): AppConfig {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const port = Number(env.PORT ?? 3000);
  const embeddingDimensions = Number(env.EMBEDDING_DIMENSIONS ?? 1536);
  const retrievalLimit = Number(env.RETRIEVAL_LIMIT ?? 4);
  const retrievalMaxDistance = Number(env.RETRIEVAL_MAX_DISTANCE ?? 0.72);
  const historyLimit = Number(env.HISTORY_LIMIT ?? 12);

  if (!Number.isInteger(port) || port < 1) {
    throw new Error('PORT must be a positive integer.');
  }
  if (!Number.isInteger(embeddingDimensions) || embeddingDimensions < 1) {
    throw new Error('EMBEDDING_DIMENSIONS must be a positive integer.');
  }
  if (!Number.isInteger(retrievalLimit) || retrievalLimit < 1) {
    throw new Error('RETRIEVAL_LIMIT must be a positive integer.');
  }
  if (!Number.isFinite(retrievalMaxDistance) || retrievalMaxDistance <= 0) {
    throw new Error('RETRIEVAL_MAX_DISTANCE must be a positive number.');
  }
  if (!Number.isInteger(historyLimit) || historyLimit < 1) {
    throw new Error('HISTORY_LIMIT must be a positive integer.');
  }

  const frontendOrigins = (env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    databaseUrl,
    port,
    nodeEnv: env.NODE_ENV ?? 'development',
    frontendOrigins,
    openRouterApiKey: env.OPENROUTER_API_KEY?.trim() ?? '',
    chatModel: env.OPENROUTER_CHAT_MODEL?.trim() ?? '',
    embeddingModel:
      env.OPENROUTER_EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-small',
    embeddingDimensions,
    retrievalLimit,
    retrievalMaxDistance,
    historyLimit,
    appUrl: env.APP_URL?.trim() || frontendOrigins[0] || 'http://localhost:5173',
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
