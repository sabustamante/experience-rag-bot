# experience-rag-bot

AI-powered chatbot that answers questions about professional experience using RAG (Retrieval-Augmented Generation). Includes a dynamic personal landing page that adapts content based on visitor profile, and a CV generator that produces ATS-optimized resumes from job postings.

## Architecture

Hexagonal (Ports & Adapters) monorepo with Turborepo + pnpm workspaces.

```
experience-rag-bot/
├── apps/
│   ├── api/          # NestJS backend (RAG engine, chat, CV generator)
│   ├── web/          # Next.js frontend (landing + chat UI)
│   └── mobile/       # React Native / Expo (chat on iOS & Android)
├── packages/
│   ├── shared-types/     # Domain interfaces and port definitions
│   ├── experience-data/  # Markdown experience files + parser + chunker
│   ├── tsconfig/         # Shared TypeScript configs
│   └── eslint-config/    # Shared ESLint configs
└── infra/
    ├── docker-compose.yml          # Full local stack
    ├── docker-compose.override.yml # Dev hot-reload overrides
    ├── postgres/init.sql           # pgvector schema
    └── cdk/                        # AWS CDK infrastructure (Stage 5)
```

## Stack

| Layer    | Tech                                 |
| -------- | ------------------------------------ |
| Backend  | Node.js 22, NestJS, TypeORM          |
| AI       | Amazon Bedrock (Claude), pgvector    |
| Frontend | Next.js 14, Tailwind CSS             |
| Mobile   | Expo SDK, React Native               |
| Infra    | AWS ECS Fargate, RDS, S3, CloudFront |
| Monorepo | Turborepo, pnpm workspaces           |

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker + Docker Compose

### Install

```bash
pnpm install
```

### Quickstart (Docker)

```bash
cp .env.example .env
# Fill in AWS credentials and any other values

cd infra
docker compose up -d
# → postgres + API are healthy

docker compose --profile seed run seed
# → populates pgvector with experience chunks

curl localhost:3001/api/health
# → { "status": "ok", ... }
```

### Type check

```bash
pnpm turbo typecheck
```

### Add your experience data

The repository ships `*.example.md` template files in `packages/experience-data/markdown/`.
Your personal data files are gitignored — they never get committed.

```bash
cd packages/experience-data

# Copy the templates
cp markdown/summary.example.md       markdown/summary.md
cp markdown/skills.example.md        markdown/skills.md
cp markdown/education.example.md     markdown/education.md

# For each company, create your own file (you can remove the example ones)
cp markdown/companies/acme-corp.example.md  markdown/companies/your-company.md

# Edit the *.md files with your real information
```

The parser automatically prefers `*.md` over `*.example.md` for each file. The bot works out of the box with the example data on a fresh clone.

### Customize the assistant's behavior

The bot has a built-in system prompt that makes it behave as a professional career assistant. You can extend it — without touching any code — by adding `SYSTEM_PROMPT_APPEND` to your `.env`:

```bash
# .env (gitignored — never committed)
SYSTEM_PROMPT_APPEND=Always respond in Spanish. Be concise and use bullet points when listing items.
```

The value is **appended** to the default prompt at startup. If the variable is not set (or empty), the default behavior is used. Restart the API after changing it.

Common uses:

- Change response language: `Always respond in Spanish.`
- Adjust tone: `Be concise. Avoid corporate jargon.`
- Add persona context: `Your name is Alex. You are a senior full-stack engineer.`

## Roadmap

| Stage | Description                          | Status  |
| ----- | ------------------------------------ | ------- |
| 0     | Monorepo scaffold                    | ✅ Done |
| 1     | NestJS backend — RAG chat end-to-end | ✅ Done |
| 2     | Docker Compose full stack locally    | ✅ Done |
| 3     | Next.js landing + chat UI            | ⏳      |
| 4     | React Native mobile app              | ⏳      |
| 5     | AWS deployment + CI/CD               | ⏳      |
| 6     | CV generator (job posting → PDF)     | ⏳      |

See [`roadmap/`](roadmap/) for detailed step-by-step plans per stage.
