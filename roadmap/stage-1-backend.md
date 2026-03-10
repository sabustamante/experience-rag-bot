# Stage 1 — Backend Core (Chat Bot MVP)

> **Goal:** A fully functional NestJS API with RAG end-to-end: a user sends a question and receives a streaming response grounded in real experience data.
>
> **Deliverable:** A `curl` or Postman request to the chat endpoint returns a streaming answer. PostgreSQL + pgvector populated with embeddings via seed script.
>
> **Depends on:** Stage 0 complete (shared-types, experience-data packages available)

---

## Steps

### 1.1 — Scaffold NestJS `apps/api`

- [ ] Create `apps/api/` directory
- [ ] Initialize NestJS project: `pnpm dlx @nestjs/cli new api --skip-git --package-manager pnpm`
- [ ] Add `package.json` `name` field to `@repo/api` for workspace resolution
- [ ] Add `tsconfig.json` extending `packages/tsconfig/nestjs.json`
- [ ] Add `.eslintrc.js` extending `packages/eslint-config/nestjs.js`
- [ ] Install `@nestjs/config` and set up `ConfigModule.forRoot({ isGlobal: true })`
- [ ] Create `.env` from `.env.example` (root level)
- [ ] Verify `pnpm --filter api dev` starts without errors

```
Commit: feature/api-scaffold
Description: Scaffold NestJS application under apps/api with workspace-compatible
package.json, shared tsconfig/eslint configs, and global ConfigModule. Entry
point for all backend business logic.
```

---

### 1.2 — Domain Ports (interfaces only)

- [ ] Create `src/domain/ports/` directory
- [ ] Create `llm-provider.port.ts` — `ILLMProvider` interface with `generateResponse` and `generateStructured`
- [ ] Create `embedding-provider.port.ts` — `IEmbeddingProvider` interface
- [ ] Create `vector-store.port.ts` — `IVectorStore` interface
- [ ] Create `experience-source.port.ts` — `IExperienceSource` interface
- [ ] Create `relational-store.port.ts` — `IRelationalStore` interface
- [ ] Create `cache-provider.port.ts` — `ICacheProvider` interface
- [ ] Create `template-engine.port.ts` — `ITemplateEngine` interface
- [ ] Add port token constants file `src/domain/ports/port.tokens.ts`:
  ```typescript
  export const PORT_TOKENS = {
    LLM_PROVIDER: 'ILLMProvider',
    EMBEDDING_PROVIDER: 'IEmbeddingProvider',
    // ...
  } as const;
  ```
- [ ] Ensure all interfaces re-use types from `@repo/shared-types` — no duplicate definitions
- [ ] Verify `pnpm --filter api typecheck` passes

```
Commit: feature/api-domain-ports
Description: Define all driven port interfaces in domain/ports/. Each interface
represents a dependency boundary. Port token constants prevent magic strings
throughout the codebase. Interfaces re-use shared-types to avoid duplication.
```

---

### 1.3 — Domain Models

- [ ] Create `src/domain/model/` directory
- [ ] Create `experience-chunk.model.ts` — `ExperienceChunk` class/type with metadata shape
- [ ] Create `chat-session.model.ts` — `ChatSession`, `ChatMessage` with role, content, timestamp
- [ ] Create `landing-content.model.ts` — `LandingContent` with profile type and sections
- [ ] Models are plain TypeScript types — zero NestJS, zero infra imports
- [ ] Verify `pnpm --filter api typecheck` passes

```
Commit: feature/api-domain-models
Description: Add domain model types (ExperienceChunk, ChatSession, LandingContent)
as pure TypeScript. No framework or infrastructure dependencies — models are
valid across any adapter implementation.
```

---

### 1.4 — Domain Services — ExperienceService + ChatService

- [ ] Create `src/domain/services/experience.service.ts`:
  - Inject `IExperienceSource`
  - `getAllExperience(): Promise<ExperienceData>`
  - `getChunks(): Promise<ExperienceChunk[]>`
  - `assembleContext(chunks: VectorSearchResult[]): string[]`
- [ ] Create `src/domain/services/chat.service.ts`:
  - Inject `ILLMProvider`, `IVectorStore`, `IEmbeddingProvider`, `ExperienceService`
  - `chat(message: string, sessionId: string): AsyncIterable<string>`
  - Logic: embed query → vector search → assemble context → LLM stream
  - Include system prompt: respond as the person's career assistant
- [ ] Create `src/domain/services/landing.service.ts`:
  - Inject `ILLMProvider`, `ICacheProvider`, `IExperienceSource`
  - `getProfileContent(profile: ProfileType): Promise<LandingContent>`
  - Implement cache-aside pattern (get → miss → generate → set)
- [ ] All services use `@Inject(PORT_TOKENS.X)` — zero infrastructure imports
- [ ] Write unit tests for each service mocking all ports:
  - `chat.service.spec.ts`
  - `experience.service.spec.ts`
  - `landing.service.spec.ts`
- [ ] Verify `pnpm --filter api test` passes

```
Commit: feature/api-domain-services
Description: Implement core domain services (ExperienceService, ChatService,
LandingService) using only port injections. Includes unit tests with all
ports mocked — zero infrastructure involved at this layer.
```

---

### 1.5 — Infrastructure: MarkdownExperienceAdapter

- [ ] Create `src/infrastructure/storage/markdown-experience.adapter.ts`
- [ ] Implement `IExperienceSource`:
  - Use `MarkdownParser` from `@repo/experience-data`
  - In-memory cache via class property (`cachedData: ExperienceData | null`)
  - `getAllExperience()` — lazy load and cache
  - `getChunks()` — delegate to chunker
- [ ] Verify adapter returns correctly typed `ExperienceData` matching the port contract
- [ ] Write integration test: reads actual `.md` files and verifies parsed output shape

```
Commit: feature/adapter-markdown-experience
Description: Implement MarkdownExperienceAdapter as the IExperienceSource driven
adapter. Reads structured Markdown files from experience-data package, parses
them with gray-matter and returns typed ExperienceData. Includes in-memory lazy
cache and integration test against real .md files.
```

---

### 1.6 — Infrastructure: Amazon Bedrock Adapters

- [ ] Install `@aws-sdk/client-bedrock-runtime`
- [ ] Create `src/infrastructure/ai/bedrock-claude.adapter.ts`:
  - Implement `ILLMProvider`
  - `generateResponse` — streaming via `InvokeModelWithResponseStreamCommand`
  - `generateStructured<T>` — invoke + parse JSON + validate with Zod schema
  - Read `BEDROCK_MODEL_ID` from config
- [ ] Create `src/infrastructure/ai/bedrock-titan-embedding.adapter.ts`:
  - Implement `IEmbeddingProvider`
  - `generateEmbedding(text)` → `number[]`
  - `generateEmbeddings(texts)` → `number[][]` (sequential or batched)
  - `getDimensions()` → `1024` (Titan v2 default)
  - Read `BEDROCK_EMBEDDING_MODEL_ID` from config
- [ ] Handle errors: model throttling, token limits, malformed responses
- [ ] Add AWS credential validation on module init (`onModuleInit`)

```
Commit: feature/adapter-bedrock
Description: Implement BedrockClaudeAdapter (ILLMProvider) and
BedrockTitanEmbeddingAdapter (IEmbeddingProvider) using AWS SDK v3.
Supports response streaming via AsyncIterable and structured output
via Zod schema validation. Credentials read from ConfigService.
```

---

### 1.7 — Infrastructure: PgVectorAdapter

- [ ] Install `pg`, `pgvector`, `@types/pg`
- [ ] Create `src/infrastructure/storage/pgvector.adapter.ts`:
  - Implement `IVectorStore`
  - `upsert(id, vector, metadata)` — INSERT or UPDATE with `vector` column
  - `search(queryVector, topK, filter?)` — cosine similarity query with optional metadata filter
  - `delete(id)` — remove by ID
- [ ] Create SQL migration / init script:
  - `CREATE EXTENSION IF NOT EXISTS vector`
  - `CREATE TABLE experience_chunks (id text PRIMARY KEY, content text, metadata jsonb, embedding vector(1024))`
  - `CREATE INDEX ON experience_chunks USING ivfflat (embedding vector_cosine_ops)`
- [ ] Read DB connection params from `ConfigService`
- [ ] Handle connection errors and reconnection

```
Commit: feature/adapter-pgvector
Description: Implement PgVectorAdapter as the IVectorStore driven adapter using
the pg client and pgvector extension. Supports cosine similarity search with
optional JSONB metadata filtering. Includes SQL init script with ivfflat index
for efficient ANN search.
```

---

### 1.8 — Infrastructure: InMemoryCacheAdapter

- [ ] Install `node-cache`
- [ ] Create `src/infrastructure/cache/in-memory-cache.adapter.ts`:
  - Implement `ICacheProvider`
  - `get<T>(key)` — return `T | null`
  - `set<T>(key, value, ttlSeconds?)` — store with optional TTL
  - `invalidate(pattern)` — delete by key pattern (glob match)
- [ ] Read default TTL from `ConfigService` (`LANDING_CACHE_TTL`)

```
Commit: feature/adapter-in-memory-cache
Description: Implement InMemoryCacheAdapter using node-cache as the ICacheProvider
adapter. Supports TTL-based expiration and pattern-based invalidation. Selected
over Redis for MVP to minimize infrastructure overhead.
```

---

### 1.9 — Module Wiring (DI)

- [ ] Create `src/modules/ai.module.ts`:
  - Factory provider for `ILLMProvider` — reads `AI_LLM_PROVIDER` env, returns correct adapter
  - Factory provider for `IEmbeddingProvider` — reads `AI_EMBEDDING_PROVIDER` env
  - Exports both tokens
- [ ] Create `src/modules/storage.module.ts`:
  - Factory provider for `IExperienceSource` — reads `EXPERIENCE_SOURCE` env (`markdown` | `database`)
  - Provider for `IVectorStore` — `PgVectorAdapter`
  - Provider for `IRelationalStore` (stub for now)
  - Provider for `ICacheProvider` — reads `CACHE_PROVIDER` env (`memory` | `redis`)
- [ ] Create `src/modules/experience.module.ts`:
  - Imports `StorageModule`
  - Provides `ExperienceService`
  - Exports `ExperienceService`
- [ ] Create `src/modules/chat.module.ts`:
  - Imports `AIModule`, `StorageModule`, `ExperienceModule`
  - Provides `ChatService`
  - Exports `ChatService`
- [ ] Create `src/modules/landing.module.ts`:
  - Imports `AIModule`, `StorageModule`, `ExperienceModule`
  - Provides `LandingService`
- [ ] Wire everything into `app.module.ts`
- [ ] Verify `pnpm --filter api dev` starts with no DI resolution errors

```
Commit: feature/api-module-wiring
Description: Wire all ports to their adapter implementations via NestJS DI modules.
Provider factories read environment variables to select adapters at runtime
(AI_LLM_PROVIDER, EXPERIENCE_SOURCE, CACHE_PROVIDER) — swapping adapters requires
only an env var change, no code modification.
```

---

### 1.10 — Application Layer: ChatController + ChatGateway

- [ ] Create `src/application/chat/dto/send-message.dto.ts`:
  - `message: string` (min 1, max 1000)
  - `sessionId: string` (UUID)
- [ ] Create `src/application/chat/chat.controller.ts`:
  - `POST /api/chat/message` — REST endpoint (non-streaming, for testing)
  - `GET /api/chat/session/:id` — retrieve chat history
  - Validate with `class-validator`
- [ ] Create `src/application/chat/chat.gateway.ts` (WebSocket via `@nestjs/websockets`):
  - Event `chat:send` — receives `{ message, sessionId }`, streams response tokens via `chat:token` events
  - Event `chat:end` — signals stream completion
  - Handle client disconnect gracefully
- [ ] Add `@nestjs/platform-socket.io` and configure CORS
- [ ] Add global validation pipe in `main.ts`
- [ ] Add rate limiting with `@nestjs/throttler` (reads `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`)

```
Commit: feature/api-chat-endpoints
Description: Add ChatController (REST) and ChatGateway (WebSocket) as driving
adapters. WebSocket streams LLM tokens in real-time via chat:token events.
Includes DTO validation, rate limiting, and graceful disconnect handling.
```

---

### 1.11 — Seed Script

- [ ] Create `src/scripts/seed.ts` (or `apps/api/scripts/seed.ts`)
- [ ] Script logic:
  1. Load experience chunks from `MarkdownExperienceAdapter`
  2. For each chunk: call `IEmbeddingProvider.generateEmbedding(chunk.content)`
  3. Upsert into pgvector via `IVectorStore.upsert(chunk.id, vector, chunk.metadata)`
  4. Log progress: chunk index, content preview, embedding dimensions
- [ ] Add `"seed": "ts-node src/scripts/seed.ts"` to `apps/api/package.json`
- [ ] Add to Turborepo pipeline as a one-off task
- [ ] Verify seed runs end-to-end against a live DB instance

```
Commit: feature/api-seed-script
Description: Add seed script that parses experience Markdown files, generates
embeddings via IEmbeddingProvider, and upserts all chunks into pgvector.
Idempotent — re-running overwrites existing chunks by ID.
```

---

## Completion Checklist

- [ ] `pnpm --filter api dev` — starts without errors
- [ ] `pnpm --filter api test` — all unit tests pass
- [ ] Domain services have zero imports from `infrastructure/`
- [ ] WebSocket chat streams tokens to a connected client
- [ ] Seed script populates pgvector with all experience chunks
- [ ] Swapping `AI_LLM_PROVIDER=openai` (even if adapter is a stub) doesn't break startup
