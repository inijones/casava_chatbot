# Casava Business Gro guide

Public-information chatbot for the Casava technical assessment. The product
brief is in `README_Casava_Chatbot.md`. This file is how to run the prototype.

The assistant answers from reviewed public pages only. It does not have the
Business Gro policy wording, so it is instructed to say when coverage,
exclusions, or a payout cannot be confirmed. It is not an official Casava product.

## Layout

- `apps/web` — React, Vite, TypeScript chat UI
- `apps/api` — NestJS API. OpenRouter is called only from here
- `knowledge/reviewed/chunks.json` — approved passages
- `knowledge/raw` — extraction notes from 22 October 2026
- `database/migrations` — pgvector schema
- `scripts/ingest-sources` — embed reviewed passages and replace stored chunks

## Run locally

Node.js 22, npm, and Docker are enough. Docker publishes Postgres on port
**5433** so it does not collide with a Postgres already using 5432.

```bash
cp .env.example .env
# Add OPENROUTER_API_KEY. Confirm OPENROUTER_CHAT_MODEL is enabled on your account.
npm install
npm run db:up
npm run db:migrate
npm run ingest
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to
http://localhost:3000. The browser never receives the OpenRouter key.

`npm test` checks the safety prompt, number redaction, the embedding stream
parser, and the reviewed passages.

## What was reviewed

On 22 October 2026 the knowledge base was taken from:

- https://casava.com/business-gro
- https://casava.com/make-a-claim
- https://casava.com/claims
- https://casava.com/terms
- https://casava.com/privacy-policy
- https://casava1.zohodesk.com/portal/en/kb/articles/what-is-business-gro
- https://casava1.zohodesk.com/portal/en/kb/articles/how-do-i-pay-for-business-gro

The product FAQ states a Business Gro fee of N200 per month for SMEDAN-registered
businesses, and says a claim is started by emailing info@smedanregister.ng.
A help-centre article describes the package as business insurance for fire and
flood, training, and loans. That description is not the policy schedule.
HealthCash rules on the claims page are stored separately and are not applied
to Business Gro. No public page reviewed here states a sum insured.

## Deploy

1. Build the API image from the repo root with `Dockerfile`. Set
   `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_CHAT_MODEL`,
   `OPENROUTER_EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS=1536`,
   `FRONTEND_ORIGIN` (the public site origin), and `NODE_ENV=production`.
2. Run `node scripts/migrate.mjs` as a release step, then
   `node scripts/ingest-sources/ingest.mjs` whenever the reviewed passages change.
   Ingestion is a CLI, not a public route.
3. Publish `apps/web` with the root `netlify.toml`. Set
   `VITE_API_BASE_URL` to the API's public `https` origin and redeploy.
4. Confirm the browser calls only your API, and that `/api/health` reports
   `chatConfigured: true` and a non-zero `knowledgeChunks`.

Chat requests are limited to 20 per minute per IP. Message bodies are capped
at 2,000 characters. Long identification and card numbers are redacted before
they are stored or sent to the model.
