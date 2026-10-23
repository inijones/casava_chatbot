import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  clearConversationId,
  getConversation,
  getHealth,
  loadConversationId,
  storeConversationId,
  streamChat,
} from './api';
import { MessageBody } from './format';
import type { ChatMessage, HealthStatus, Source } from './types';

const STARTERS = [
  'Who can get Business Gro?',
  'How much does Business Gro cost?',
  'How do I pay or register?',
  'How do I start a Business Gro claim?',
  'Is fire damage covered?',
  'What does HealthCash cover?',
];

function newId(): string {
  return crypto.randomUUID();
}

function safeSources(sources: Source[] | undefined): Source[] {
  return (sources ?? []).filter((source) => source.sourceUrl.startsWith('https://'));
}

export default function App() {
  const inputId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getHealth()
      .then((status) => {
        if (!controller.signal.aborted) setHealth(status);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealthError('The assistant server is not reachable.');
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const saved = loadConversationId();
    if (!saved) return;
    let cancelled = false;
    getConversation(saved)
      .then((conversation) => {
        if (cancelled) return;
        setConversationId(conversation.conversationId);
        setMessages(
          conversation.messages.map((message) => ({
            id: newId(),
            role: message.role,
            content: message.content,
            sources: safeSources(message.sources),
          })),
        );
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        clearConversationId();
        if (reason instanceof Error && reason.message !== 'missing') {
          setError(reason.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, error, notice]);

  function updateAssistant(id: string, patch: (message: ChatMessage) => ChatMessage) {
    setMessages((current) => current.map((message) => (message.id === id ? patch(message) : message)));
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setError(null);
    setNotice(null);
    setDraft('');
    const assistantId = newId();
    setMessages((current) => [
      ...current,
      { id: newId(), role: 'user', content: message, sources: [] },
      { id: assistantId, role: 'assistant', content: '', sources: [], pending: true },
    ]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        conversationId,
        message,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.conversationId) {
            setConversationId(event.conversationId);
            storeConversationId(event.conversationId);
          }
          if (event.notice) setNotice(event.notice);
          if (event.sources) {
            const sources = safeSources(event.sources);
            updateAssistant(assistantId, (item) => ({ ...item, sources }));
          }
          if (event.token) {
            updateAssistant(assistantId, (item) => ({ ...item, content: item.content + event.token }));
          }
          if (event.error) {
            setError(event.error);
            setMessages((current) =>
              current.filter((item) => item.id !== assistantId || item.content.trim().length > 0),
            );
          }
          if (event.done) {
            updateAssistant(assistantId, (item) => ({ ...item, pending: false }));
          }
        },
      });
      updateAssistant(assistantId, (item) => ({ ...item, pending: false }));
    } catch (reason) {
      if (controller.signal.aborted) {
        updateAssistant(assistantId, (item) => ({ ...item, pending: false }));
      } else {
        const textError = reason instanceof Error ? reason.message : 'The assistant could not reply.';
        setError(textError);
        setMessages((current) => current.filter((item) => item.id !== assistantId || item.content.trim().length > 0));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    abortRef.current?.abort();
    clearConversationId();
    setConversationId(null);
    setMessages([]);
    setError(null);
    setNotice(null);
    setDraft('');
  }

  const knowledgeReady = (health?.knowledgeChunks ?? 0) > 0;
  const chatReady = health?.chatConfigured === true;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="logo" src="/casava_image.jpeg" alt="" width={44} height={44} />
          <div>
            <h1>Casava</h1>
            <p className="eyebrow">Business Gro</p>
          </div>
        </div>
        <button type="button" className="text-button" onClick={reset}>
          New chat
        </button>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <p className="lede">
            Answers come from reviewed public Casava pages. This is not an official Casava channel and it cannot
            decide a claim.
          </p>
          <div className="status" aria-live="polite">
            <StatusLine health={health} healthError={healthError} knowledgeReady={knowledgeReady} chatReady={chatReady} />
          </div>
          <p className="side-label">Try a question</p>
          <div className="starters">
            {STARTERS.map((prompt) => (
              <button key={prompt} type="button" disabled={streaming} onClick={() => void send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <main className="chat">
          <div className="messages" ref={scroller}>
            {messages.length === 0 ? (
              <section className="empty">
                <h2>
                  Ask about <span>Business Gro</span>
                </h2>
                <p>
                  Eligibility, the published monthly fee, how to pay, and how to start a claim are in the reviewed
                  pages. The policy wording is not, so coverage questions get an honest limit instead of a guess.
                </p>
              </section>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`bubble ${message.role} ${message.pending ? 'pending' : ''}`}>
                  <p className="who">{message.role === 'user' ? 'You' : 'Guide'}</p>
                  {message.content ? <MessageBody text={message.content} /> : <p className="thinking">Looking through the public pages…</p>}
                  {message.role === 'assistant' && message.sources.length > 0 ? (
                    <ul className="sources">
                      {message.sources.map((source) => (
                        <li key={source.sourceUrl}>
                          <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                            {source.sourceTitle || source.sourceUrl}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))
            )}
          </div>

          {notice ? <p className="banner notice">{notice}</p> : null}
          {error ? (
            <p className="banner error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="composer" onSubmit={onSubmit}>
            <label htmlFor={inputId}>Ask about Business Gro</label>
            <div className="composer-row">
              <textarea
                id={inputId}
                rows={2}
                maxLength={2000}
                value={draft}
                placeholder="Ask about eligibility, price, claims, or what the public pages do not say."
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
              />
              {streaming ? (
                <button type="button" className="send stop" onClick={stop}>
                  Stop
                </button>
              ) : (
                <button type="submit" className="send" disabled={draft.trim().length === 0}>
                  Send
                </button>
              )}
            </div>
            <p className="fineprint">
              {draft.length}/2000. Do not send ID numbers, card numbers, medical details, or claim photos. Policy
              wording stays with Casava.
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

function StatusLine({
  health,
  healthError,
  knowledgeReady,
  chatReady,
}: {
  health: HealthStatus | null;
  healthError: string | null;
  knowledgeReady: boolean;
  chatReady: boolean;
}) {
  if (healthError) return <span>{healthError}</span>;
  if (!health) return <span>Checking the assistant…</span>;
  if (health.database === 'down') return <span>The database is not connected.</span>;
  if (!health.pgvector) return <span>PostgreSQL is up, and the vector extension is missing.</span>;
  if (!chatReady) return <span>Add the OpenRouter key and chat model on the server before asking questions.</span>;
  if (!knowledgeReady) {
    return <span>The server is up. Reviewed pages are not loaded yet, so product answers stay limited.</span>;
  }
  return <span>{health.knowledgeChunks} reviewed passages are ready.</span>;
}
