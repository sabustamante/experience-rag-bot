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
- AWS account with Bedrock access enabled (Claude + Titan Embeddings models)
- AWS CLI configured (`aws configure`)

### Install

```bash
pnpm install
```

### Environment setup

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable                     | Description                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `AWS_PROFILE`                | AWS CLI profile with Bedrock + ECR access                                        |
| `BEDROCK_MODEL_ID`           | Claude inference profile ID (e.g. `us.anthropic.claude-haiku-4-5-20251001-v1:0`) |
| `BEDROCK_EMBEDDING_MODEL_ID` | Embedding model (e.g. `amazon.titan-embed-text-v2:0`)                            |
| `DOMAIN_NAME`                | Your domain (e.g. `example.com`) — only needed for CDK deploy                    |
| `CERTIFICATE_ARN`            | ACM certificate ARN for your domain — only needed for CDK deploy                 |

### Quickstart (Docker)

```bash
cd infra
docker compose up -d
# → postgres + API are healthy

docker compose --profile seed run seed
# → populates pgvector with experience chunks

curl localhost:3001/api/health
# → { "status": "ok", ... }
```

### Deploy to AWS

```bash
# Load env vars (set -a exports them to child processes)
set -a && source .env && set +a

# 1. Bootstrap CDK (once per account/region)
cd infra/cdk && npm install && npx cdk bootstrap && cd ../..

# 2. Build and push the API image to ECR
bash infra/scripts/push-ecr.sh

# 3. Deploy all stacks
cd infra/cdk && npx cdk deploy --all && cd ../..

# 4. Build and deploy the frontend
bash infra/scripts/deploy-frontend.sh
```

**Required AWS permissions** for the deploy user/role:

- `AmazonEC2FullAccess`
- `AmazonECS_FullAccess`
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess`
- `CloudFrontFullAccess`
- `AWSCloudFormationFullAccess`
- `IAMFullAccess`
- `AmazonSSMFullAccess`
- `AWSCertificateManagerFullAccess`

**Required SSM parameters** (set once before deploying):

```bash
APP=experience-rag-bot
aws ssm put-parameter --name "/$APP/prod/API_PORT"                 --value "3001"           --type String
aws ssm put-parameter --name "/$APP/prod/AI_LLM_PROVIDER"          --value "bedrock"        --type String
aws ssm put-parameter --name "/$APP/prod/AI_EMBEDDING_PROVIDER"    --value "bedrock"        --type String
aws ssm put-parameter --name "/$APP/prod/BEDROCK_MODEL_ID"         --value "<your-model>"  --type String
aws ssm put-parameter --name "/$APP/prod/BEDROCK_EMBEDDING_MODEL_ID" --value "<your-model>" --type String
aws ssm put-parameter --name "/$APP/prod/EXPERIENCE_SOURCE"        --value "markdown"       --type String
aws ssm put-parameter --name "/$APP/prod/CACHE_PROVIDER"           --value "memory"         --type String
aws ssm put-parameter --name "/$APP/prod/CORS_ORIGINS"             --value "https://your-domain.com" --type String
aws ssm put-parameter --name "/$APP/prod/RATE_LIMIT_TTL"           --value "60000"          --type String
aws ssm put-parameter --name "/$APP/prod/RATE_LIMIT_MAX"           --value "20"             --type String
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

The system prompt is loaded from a file at startup (first match wins):

1. `apps/api/system-prompt.md` — your personal prompt (**gitignored, never committed**)
2. `apps/api/system-prompt.example.md` — the default shipped with the repo

This mirrors the `.env` / `.env.example` pattern. Edit your personal file freely — it will never be committed.

```bash
cp apps/api/system-prompt.example.md apps/api/system-prompt.md
# Edit system-prompt.md with your own tone, language, persona, etc.
```

**In Docker**, both files are copied into the image at build time if present. To update the prompt without rebuilding, mount your file at runtime:

```bash
# docker-compose.override.yml
services:
  api:
    volumes:
      - ./apps/api/system-prompt.md:/repo/apps/api/system-prompt.md
```

## Roadmap

| Stage | Description                          | Status  |
| ----- | ------------------------------------ | ------- |
| 0     | Monorepo scaffold                    | ✅ Done |
| 1     | NestJS backend — RAG chat end-to-end | ✅ Done |
| 2     | Docker Compose full stack locally    | ✅ Done |
| 3     | Next.js landing + chat UI            | ✅ Done |
| 4     | React Native mobile app              | ⏳      |
| 5     | AWS deployment + CI/CD               | ✅ Done |
| 6     | CV generator (job posting → PDF)     | ⏳      |

See [`roadmap/`](roadmap/) for detailed step-by-step plans per stage.
