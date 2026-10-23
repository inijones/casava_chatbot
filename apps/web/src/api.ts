import type { HealthStatus, ServerEvent } from './types';

const CONVERSATION_KEY = 'casava-chat-conversation-id';

export function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (!configured) return '';
  return configured.replace(/\/$/, '');
}

export function loadConversationId(): string | null {
  return sessionStorage.getItem(CONVERSATION_KEY);
}

export function storeConversationId(id: string): void {
  sessionStorage.setItem(CONVERSATION_KEY, id);
}

export function clearConversationId(): void {
  sessionStorage.removeItem(CONVERSATION_KEY);
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${apiBase()}/api/health`);
  const body = (await response.json()) as HealthStatus;
  if (!response.ok && body?.database !== 'down' && body?.database !== 'up') {
    throw new Error('The assistant server is not reachable.');
  }
  return body;
}

export async function getConversation(conversationId: string): Promise<{
  conversationId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; sources: ServerEvent['sources'] }>;
}> {
  const response = await fetch(`${apiBase()}/api/conversations/${conversationId}`);
  if (response.status === 404) {
    throw new Error('missing');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || 'The previous conversation could not be loaded.');
  }
  return response.json();
}

export async function streamChat(input: {
  conversationId: string | null;
  message: string;
  signal: AbortSignal;
  onEvent: (event: ServerEvent) => void;
}): Promise<void> {
  const response = await fetch(`${apiBase()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: input.conversationId ?? undefined,
      message: input.message,
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || 'The assistant could not reply.');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('This browser could not read the reply stream.');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame
        .split('\n')
        .map((item) => item.trim())
        .find((item) => item.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      input.onEvent(JSON.parse(payload) as ServerEvent);
    }
  }
}
