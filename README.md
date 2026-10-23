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

## Deploy from GitHub

Cloudflare Pages serves the website. Northflank runs the API from the
Dockerfile. Neon stores conversations and the vectors. A push to `main`
rebuilds the site and the API.

The `knowledge/` folder is not a public URL. GitHub keeps the reviewed
passages. The API image copies them in. One ingest command embeds
`knowledge/reviewed/chunks.json` and writes the vectors into Neon. After
that, each chat question reads Neon. The browser never downloads the
knowledge files.

### 1. Neon

Create a project and copy the **direct** connection string, the one whose
host does not contain `-pooler`. Leave `sslmode=require` on it. The first
API boot runs `database/migrations/001_init.sql`, which enables `pgvector`.

### 2. Northflank, connected to GitHub

Create a combined service from `inijones/casava_chatbot`, branch `main`,
build type Dockerfile, Dockerfile path `Dockerfile`. Expose port `3000`
with a public HTTP endpoint. Health check path: `/api/health`.

Environment:

```text
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
OPENROUTER_API_KEY=
OPENROUTER_CHAT_MODEL=openai/gpt-4o-mini
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
FRONTEND_ORIGIN=https://your-project.pages.dev
NODE_ENV=production
APP_URL=https://your-project.pages.dev
PORT=3000
```

`FRONTEND_ORIGIN` can be a comma-separated list when you add a custom domain.
Set it to the real Pages URL, then redeploy the API so the browser is allowed
to call it.

After the first healthy deploy, open a Northflank command on that service and
run this once:

```bash
node scripts/ingest-sources/ingest.mjs
```

Run it again only after `knowledge/reviewed/chunks.json` changes and that
commit has been deployed. The command replaces the stored passages.

### 3. Cloudflare Pages, connected to the same GitHub repo

Production branch `main`. Root directory `/`. Build command:

```bash
npm run build -w web
```

Build output directory: `apps/web/dist`.

Set this variable, then retry the deployment. Vite reads it at build time:

```text
VITE_API_BASE_URL=https://your-api.northflank.app
```

No trailing slash. The value is the Northflank public origin.

### 4. Check

Open `/api/health`. It should report `database: "up"`, `pgvector: true`,
`chatConfigured: true`, and `knowledgeChunks` greater than zero. In the
browser network panel, chat requests go to your Northflank origin and not to
`openrouter.ai`.

Chat requests are limited to 20 per minute per IP. Message bodies are capped
at 2,000 characters. Long identification and card numbers are redacted before
they are stored or sent to the model.
