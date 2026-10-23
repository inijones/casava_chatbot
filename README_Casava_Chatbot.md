# Casava Business Gro AI Chatbot

A public-facing insurance-support chatbot prototype for the Casava
technical assessment. It answers questions using verified public Casava
information, retrieves relevant passages with RAG (Retrieval-Augmented
Generation), streams responses to the browser, and keeps conversation
history.

> **Important:** This is an assessment prototype, not an official Casava
> product. Public webpages are not a substitute for the policy wording.
> Never invent covered events, exclusions, claim decisions, or payouts.
> If the applicable policy is unavailable, say so and direct the user to
> Casava.

## 1. Project goals

-   Responsive chat UI suitable for desktop and mobile.
-   Public HTTPS URL for assessors.
-   LLM calls made only from the backend; API keys never appear in
    browser code.
-   Streaming answer output from backend to frontend.
-   RAG over a small, source-tracked Casava knowledge base.
-   PostgreSQL conversation storage and pgvector similarity search.
-   Honest fallback when information is missing or the policy wording is
    unavailable.
-   Basic error handling, rate limiting, CORS restrictions, and request
    validation.

## 2. Proposed architecture

``` text
Browser
  |
  | HTTPS: POST /api/chat (streaming response)
  v
React + Vite frontend (Netlify or Cloudflare Pages)
  |
  v
NestJS API (Northflank or another HTTPS host)
  |                         |
  |                         +--> OpenRouter chat model
  |                         |
  |                         +--> OpenRouter embeddings API
  |
  +--> PostgreSQL + pgvector
          - source-tracked knowledge chunks and vectors
          - conversations
          - messages
```

The LLM and embedding model are hosted by the model provider. You do
**not** need to install Ollama or download BGE-M3 for this deployment.
Ollama is optional for local experiments only.

### What happens for each question?

1.  The browser sends the user's message and a conversation ID to
    NestJS.
2.  NestJS validates the request and creates an embedding for the
    question through OpenRouter.
3.  PostgreSQL/pgvector finds the closest matching approved knowledge
    chunks.
4.  NestJS sends the question, relevant passages, and safety
    instructions to the selected chat model through OpenRouter.
5.  NestJS forwards generated text to the browser as a stream.
6.  NestJS stores the user message and final assistant response in
    PostgreSQL.

Create embeddings for source chunks during ingestion. Create a new
embedding for each user question during retrieval. Use the **same
embedding model and vector dimensions** for both.

## 3. Suggested technology stack

-   **Frontend:** React, Vite, TypeScript.
-   **Backend:** NestJS, TypeScript.
-   **Streaming:** `fetch()` in the browser with a streamed response;
    backend may send SSE-formatted events over a POST response. Native
    `EventSource` is not required.
-   **LLM and embeddings:** OpenRouter APIs.
-   **Database:** PostgreSQL with the `vector` (pgvector) extension.
-   **Validation:** `class-validator` / `class-transformer` in NestJS.
-   **Deployment:** Static frontend host + public HTTPS backend +
    managed PostgreSQL.
-   **Local development:** macOS, Node.js LTS, npm, Git. Docker Desktop
    is optional if using a local PostgreSQL container.

Choose the actual chat model from the OpenRouter model catalogue and
confirm it supports chat completions. Choose an embedding model from the
embedding catalogue and confirm it is available to your account. Do not
assume a model or its usage is free; check current pricing, rate limits,
and data-use terms.

## 4. Requirements on your Mac

Install: - Node.js LTS (which includes npm) - Git - A code editor such
as Cursor - PostgreSQL locally, or Docker Desktop to run PostgreSQL
locally

Check the tools:

``` bash
node --version
npm --version
git --version
```

You do **not** need Ollama for the hosted-inference setup.

## 5. Create the repository

Suggested monorepo layout:

``` text
casava-chatbot/
├── apps/
│   ├── web/                 # React + Vite
│   └── api/                 # NestJS
├── scripts/
│   └── ingest-sources/      # fetch/extract/review source pages
├── knowledge/
│   ├── raw/                 # extracted source snapshots (review before use)
│   └── reviewed/            # approved JSON/Markdown chunks
├── database/
│   └── migrations/
├── .env.example
├── .gitignore
└── README.md
```

Create the project directory:

``` bash
mkdir casava-chatbot
cd casava-chatbot
git init
```

Create the React app:

``` bash
npm create vite@latest apps/web -- --template react-ts
cd apps/web
npm install
cd ../..
```

Create the NestJS app:

``` bash
npm install -g @nestjs/cli
nest new apps/api --package-manager npm
```

If your Nest CLI version does not accept a nested path cleanly, run
`nest new api` from inside `apps/` and keep the same intended layout.

## 6. Environment variables and secrets

Create `.env.example` at the repository root. Keep real secrets in an
untracked `.env` locally and in your hosting provider's
secret/environment-variable settings in production.

``` dotenv
# OpenRouter — backend only
OPENROUTER_API_KEY=
OPENROUTER_CHAT_MODEL=
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/casava_chatbot

# Backend
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development

# Optional ingestion settings
KNOWLEDGE_DIR=knowledge/reviewed
```

Add these to `.gitignore`:

``` gitignore
.env
.env.*
!.env.example
node_modules/
dist/
coverage/
.DS_Store
knowledge/raw/private/
```

Never put `OPENROUTER_API_KEY` in a Vite variable such as
`VITE_OPENROUTER_API_KEY`: Vite variables are exposed to frontend code.
The browser must call your NestJS API, not OpenRouter directly.

OpenRouter references: - API docs: https://openrouter.ai/docs -
Embeddings API:
https://openrouter.ai/docs/api/api-reference/embeddings/create-embeddings -
Embedding model catalogue:
https://openrouter.ai/models?fmt=cards&output_modalities=embeddings -
Chat model catalogue: https://openrouter.ai/models

## 7. Casava source collection and knowledge-base rules

Start with these official public pages:

1.  Business Gro: https://casava.com/business-gro
2.  Make a Claim: https://casava.com/make-a-claim
3.  Claims: https://casava.com/claims
4.  Terms: https://casava.com/terms
5.  Privacy policy: https://casava.com/privacy-policy

These pages are starting sources, not a complete policy pack. Re-check
each URL when implementing because site content may change. The Business
Gro page has stated eligibility, a monthly price, and basic claims
instructions. The full policy wording, covered events, exclusions,
sub-limits, and claim assessment rules have **not** been verified from
the public information collected for this assessment.

### Safe source-ingestion workflow

1.  Fetch only public pages you are permitted to access. Respect the
    website's terms, robots directives, rate limits, and copyright.
2.  Extract the main readable text. Remove menus, repeated navigation,
    scripts, and unrelated page furniture.
3.  Save the page URL, retrieval timestamp, title, and extracted text.
4.  Review the text manually. Do not trust a successful HTTP response as
    proof the page content was extracted correctly.
5.  Keep source provenance on every chunk so responses can link to the
    source.
6.  Split text into meaningful passages, initially around 300--600 words
    with modest overlap. Adjust based on actual content.
7.  Embed each reviewed passage and store the text, metadata, and vector
    in PostgreSQL.
8.  Re-run ingestion only when a source changes; update or replace old
    chunks to avoid duplicate/stale content.

For a simple prototype, a manual, reviewed Markdown or JSON knowledge
base is acceptable and may be safer than fully automatic scraping. If a
page is JavaScript-rendered and the extracted text is incomplete, use a
browser automation tool such as Playwright after checking the site's
access rules.

Suggested JSON shape for a reviewed chunk:

``` json
{
  "source_url": "https://casava.com/business-gro",
  "source_title": "Business Gro",
  "retrieved_at": "2026-10-22T00:00:00Z",
  "category": "eligibility",
  "content": "Reviewed factual passage copied or summarized from the official source."
}
```

The timestamp above is an example; use the actual ingestion time. Do not
claim the content was verified if it has not been reviewed.

## 8. Database design

Use a database migration to enable pgvector and create tables. Do not
rely on a hand-edited production database.

Example starting schema (confirm that the selected embedding model
returns 1,536 dimensions before using `VECTOR(1536)`):

``` sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_title TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX knowledge_chunks_category_idx
  ON knowledge_chunks(category);

-- Add a vector index only after enough data exists and after checking
-- the index operator class and query distance operator match.
```

`VECTOR(1536)` is for an embedding model configured to return 1,536
dimensions. If you change model or dimensions, create a compatible
schema and re-embed all chunks; vectors from different embedding models
should not be mixed.

## 9. Retrieval and answer-generation behaviour

Create a NestJS service with separate functions for: - `embedText(text)`
--- calls OpenRouter embeddings. - `retrieveChunks(queryVector)` ---
finds relevant chunks in pgvector. -
`generateAnswer(question, history, chunks)` --- calls the chat model. -
`streamAnswer(...)` --- streams answer chunks to the frontend. -
`saveMessage(...)` --- persists messages.

The answer-generation prompt should instruct the model to: - Use
retrieved passages for Casava-specific factual claims. - Not invent
insurance coverage, exclusions, eligibility exceptions, or claim
outcomes. - Distinguish general public information from confirmed policy
terms. - Say when the source material does not answer the question. -
Provide source links for factual answers. - Never claim that the full
₦1,000,000 is payable for every incident. - Avoid collecting unnecessary
personal or financial information.

### Example safe fallback

If a user asks whether fire damage is covered but the applicable policy
wording is missing:

> I can't confirm whether this incident is covered from the public
> information available to me. Coverage and payment depend on the
> applicable policy wording and claim assessment. Please check your
> policy document or contact Casava for confirmation.

The assessment brief may state a ₦1,000,000 coverage figure. Treat it as
assessment-provided context, not proof that all claims receive that
amount.

## 10. Streaming implementation notes

A practical approach is: - Frontend sends `POST /api/chat` with
`{ conversationId, message }`. - Backend returns a streamed response
with a documented content type and framing format. - Frontend reads
`response.body` using a `ReadableStream` reader and appends text as it
arrives. - Store the completed response in PostgreSQL once generation
finishes, and handle cancelled or failed streams safely.

If using SSE-formatted messages over `fetch`, encode events
consistently, for example `data: {"token":"Hello"}\n\n`, and send a
final event such as `data: {"done":true}\n\n`. Make sure errors have a
clear event format and the frontend can handle disconnects. Native
`EventSource` is designed for GET and is not necessary for this POST
workflow.

## 11. Conversation memory

Keep RAG and conversation memory separate: - **RAG** retrieves official
Casava facts from the knowledge base. - **Conversation memory** stores
what the customer and chatbot said earlier.

For each request, load a bounded recent message history from PostgreSQL.
Do not send the entire conversation indefinitely. Use a sensible limit
or summarization strategy, and do not treat previous assistant answers
as authoritative policy evidence.

For an assessment demo, a random UUID conversation ID stored in browser
session storage is sufficient to identify a conversation. Avoid storing
sensitive customer details unnecessarily.

## 12. Security and reliability checklist

-   [ ] API keys are only on the backend.
-   [ ] `.env` is not committed.
-   [ ] Production uses HTTPS.
-   [ ] CORS allows only the deployed frontend origin.
-   [ ] Request body and message length are validated.
-   [ ] Rate limits protect public chat and ingestion routes.
-   [ ] Ingestion endpoints are not publicly exposed without
    authentication.
-   [ ] Database is not exposed to the public internet unnecessarily.
-   [ ] SQL queries are parameterized.
-   [ ] Errors do not reveal keys, prompts, stack traces, or database
    credentials.
-   [ ] Model output is treated as untrusted text and rendered safely.
-   [ ] The chatbot clearly indicates when policy wording is
    unavailable.
-   [ ] Source links are shown for relevant answers.
-   [ ] Provider quotas, pricing, and data handling are checked before
    demo day.

## 13. Deployment plan

### A. Local development

1.  Start PostgreSQL with pgvector locally or use a managed development
    database.
2.  Configure the API `.env`.
3.  Run database migrations.
4.  Ingest reviewed knowledge chunks and their embeddings.
5.  Start the NestJS API and React frontend.
6.  Test retrieval, citations, streaming, error handling, and memory.

### B. Deploy the API

1.  Push the repository to GitHub.
2.  Create a NestJS service in Northflank (or another host).
3.  Configure `DATABASE_URL`, `OPENROUTER_API_KEY`, both model IDs,
    `FRONTEND_ORIGIN`, and `NODE_ENV` as secrets/environment variables.
4.  Run migrations safely as a release/deploy step.
5.  Confirm the API health endpoint works through its public HTTPS URL.

### C. Deploy the frontend

1.  Deploy `apps/web` to Netlify or Cloudflare Pages.
2.  Configure a frontend API-base URL, for example
    `VITE_API_BASE_URL=https://your-api-host.example`.
3.  Redeploy and test the public URL from another device or mobile data.
4.  Confirm the browser never makes requests to OpenRouter directly.

### D. Before sharing with assessors

-   Ask several questions that should match different source pages.
-   Ask questions whose answers are missing and verify the safe
    fallback.
-   Refresh the page and test conversation continuity.
-   Check streaming on a slow connection.
-   Check the API and model-provider quotas.
-   Keep a backup demo recording in case a free-tier quota or provider
    outage occurs.

## 14. Suggested build milestones

1.  **Milestone 1:** Create repository, frontend chat UI, NestJS health
    endpoint.
2.  **Milestone 2:** Configure OpenRouter chat completions and show a
    basic response.
3.  **Milestone 3:** Configure embeddings API and verify the returned
    vector length.
4.  **Milestone 4:** Set up PostgreSQL + pgvector; ingest two or three
    reviewed chunks.
5.  **Milestone 5:** Retrieve chunks and include source links in model
    answers.
6.  **Milestone 6:** Add streaming and persisted conversation history.
7.  **Milestone 7:** Add safety fallbacks, rate limits, input
    validation, and error states.
8.  **Milestone 8:** Deploy frontend and backend; test the public URL
    end to end.

## 15. Official references

-   Casava Business Gro: https://casava.com/business-gro
-   Casava Make a Claim: https://casava.com/make-a-claim
-   Casava Claims: https://casava.com/claims
-   Casava Terms: https://casava.com/terms
-   Casava Privacy Policy: https://casava.com/privacy-policy
-   OpenRouter documentation: https://openrouter.ai/docs
-   OpenRouter embeddings API:
    https://openrouter.ai/docs/api/api-reference/embeddings/create-embeddings
-   OpenRouter embedding model catalogue:
    https://openrouter.ai/models?fmt=cards&output_modalities=embeddings
-   pgvector: https://github.com/pgvector/pgvector
-   NestJS: https://docs.nestjs.com/
-   Vite: https://vite.dev/guide/

------------------------------------------------------------------------

**Build principle:** keep the implementation small, the source trail
visible, and the model honest. A reliable chatbot that admits when
policy details are unavailable is better than one that confidently
fabricates insurance terms.
