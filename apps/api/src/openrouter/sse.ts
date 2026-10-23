export type UpstreamEvent =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function eventsFromSseLine(line: string): UpstreamEvent[] {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) return [];
  if (!trimmed.startsWith('data:')) return [];

  const data = trimmed.slice(5).trim();
  if (data === '[DONE]') return [{ type: 'done' }];

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const record = parsed as {
    error?: { message?: string } | string;
    choices?: Array<{ delta?: { content?: unknown } }>;
  };

  if (record.error) {
    const message =
      typeof record.error === 'string'
        ? record.error
        : record.error.message || 'The model provider returned an error.';
    return [{ type: 'error', message }];
  }

  const token = record.choices?.[0]?.delta?.content;
  if (typeof token === 'string' && token.length > 0) {
    return [{ type: 'token', token }];
  }
  return [];
}

export function toVectorLiteral(values: number[], dimensions: number): string {
  if (values.length !== dimensions) {
    throw new Error(
      `Expected ${dimensions} embedding dimensions, received ${values.length}.`,
    );
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Embedding contained a non-finite number.');
  }
  return `[${values.join(',')}]`;
}
