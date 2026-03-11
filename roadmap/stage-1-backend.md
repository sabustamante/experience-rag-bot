# Stage 1 — Backend Core (Chat Bot MVP)

> **Goal:** A fully functional NestJS API with RAG end-to-end: a user sends a question and receives a streaming response grounded in real experience data.
>
> **Deliverable:** A `curl` or Postman request to the chat endpoint returns a streaming answer. PostgreSQL + pgvector populated with embeddings via seed script.
>
> **Depends on:** Stage 0 complete (shared-types, experience-data packages available)

---

## Steps

### 1.1 — Scaffold NestJS `apps/api`

- [x] Create `apps/api/` directory
- [x] Initialize NestJS project: `pnpm dlx @nestjs/cli new api --skip-git --package-manager pnpm`
- [x] Add `package.json` `name` field to `@repo/api` for workspace resolution
- [x] Add `tsconfig.json` extending `packages/tsconfig/nestjs.json`
- [x] Add `.eslintrc.js` extending `packages/eslint-config/nestjs.js`
- [x] Install `@nestjs/config` and set up `ConfigModule.forRoot({ isGlobal: true })`
- [x] Create `.env` from `.env.example` (root level)
- [x] Verify `pnpm --filter api dev` starts without errors

---

### 1.2 — Domain Ports (interfaces only)

- [x] Create `src/domain/ports/` directory
- [x] Create `llm-provider.port.ts` — `ILLMProvider` interface with `generateResponse` and `generateStructured`
- [x] Create `embedding-provider.port.ts` — `IEmbeddingProvider` interface
- [x] Create `vector-store.port.ts` — `IVectorStore` interface
- [x] Create `experience-source.port.ts` — `IExperienceSource` interface
- [x] Create `relational-store.port.ts` — `IRelationalStore` interface
- [x] Create `cache-provider.port.ts` — `ICacheProvider` interface
- [x] Create `template-engine.port.ts` — `ITemplateEngine` interface
- [x] Add port token constants file `src/domain/ports/port.tokens.ts`:
  ```typescript
  export const PORT_TOKENS = {
    LLM_PROVIDER: "ILLMProvider",
    EMBEDDING_PROVIDER: "IEmbeddingProvider",
    // ...
  } as const;
  ```
- [x] Ensure all interfaces re-use types from `@repo/shared-types` — no duplicate definitions
- [x] Verify `pnpm --filter api typecheck` passes

---

### 1.3 — Domain Models

- [x] Create `src/domain/model/` directory
- [x] Create `experience-chunk.model.ts` — `ExperienceChunk` class/type with metadata shape
- [x] Create `chat-session.model.ts` — `ChatSession`, `ChatMessage` with role, content, timestamp
- [x] Create `landing-content.model.ts` — `LandingContent` with profile type and sections
- [x] Models are plain TypeScript types — zero NestJS, zero infra imports
- [x] Verify `pnpm --filter api typecheck` passes

---

### 1.4 — Domain Services — ExperienceService + ChatService

- [x] Create `src/domain/services/experience.service.ts`:
  - Inject `IExperienceSource`
  - `getAllExperience(): Promise<ExperienceData>`
  - `getChunks(): Promise<ExperienceChunk[]>`
  - `assembleContext(chunks: VectorSearchResult[]): string[]`
- [x] Create `src/domain/services/chat.service.ts`:
  - Inject `ILLMProvider`, `IVectorStore`, `IEmbeddingProvider`, `ExperienceService`
  - `chat(message: string, sessionId: string): AsyncIterable<string>`
  - Logic: embed query → vector search → assemble context → LLM stream
  - Include system prompt: respond as the person's career assistant
- [x] Create `src/domain/services/landing.service.ts`:
  - Inject `ILLMProvider`, `ICacheProvider`, `IExperienceSource`
  - `getProfileContent(profile: ProfileType): Promise<LandingContent>`
  - Implement cache-aside pattern (get → miss → generate → set)
- [x] All services use `@Inject(PORT_TOKENS.X)` — zero infrastructure imports
- [x] Write unit tests for each service mocking all ports:
  - `chat.service.spec.ts`
  - `experience.service.spec.ts`
  - `landing.service.spec.ts`
- [x] Verify `pnpm --filter api test` passes

---

### 1.5 — Infrastructure: MarkdownExperienceAdapter

- [x] Create `src/infrastructure/storage/markdown-experience.adapter.ts`
- [x] Implement `IExperienceSource`:
  - Use `MarkdownParser` from `@repo/experience-data`
  - In-memory cache via class property (`cachedData: ExperienceData | null`)
  - `getAllExperience()` — lazy load and cache
  - `getChunks()` — delegate to chunker
- [x] Verify adapter returns correctly typed `ExperienceData` matching the port contract
- [x] Write integration test: reads actual `.md` files and verifies parsed output shape

---

### 1.6 — Infrastructure: Amazon Bedrock Adapters

- [x] Install `@aws-sdk/client-bedrock-runtime`
- [x] Create `src/infrastructure/ai/bedrock-claude.adapter.ts`:
  - Implement `ILLMProvider`
  - `generateResponse` — streaming via `InvokeModelWithResponseStreamCommand`
  - `generateStructured<T>` — invoke + parse JSON + validate with Zod schema
  - Read `BEDROCK_MODEL_ID` from config
- [x] Create `src/infrastructure/ai/bedrock-titan-embedding.adapter.ts`:
  - Implement `IEmbeddingProvider`
  - `generateEmbedding(text)` → `number[]`
  - `generateEmbeddings(texts)` → `number[][]` (sequential or batched)
  - `getDimensions()` → `1024` (Titan v2 default)
  - Read `BEDROCK_EMBEDDING_MODEL_ID` from config
- [x] Handle errors: model throttling, token limits, malformed responses
- [x] Add AWS credential validation on module init (`onModuleInit`)

---

### 1.7 — Infrastructure: PgVectorAdapter

- [x] Install `pg`, `pgvector`, `@types/pg`
- [x] Create `src/infrastructure/storage/pgvector.adapter.ts`:
  - Implement `IVectorStore`
  - `upsert(id, vector, metadata)` — INSERT or UPDATE with `vector` column
  - `search(queryVector, topK, filter?)` — cosine similarity query with optional metadata filter
  - `delete(id)` — remove by ID
- [x] Create SQL migration / init script:
  - `CREATE EXTENSION IF NOT EXISTS vector`
  - `CREATE TABLE experience_chunks (id text PRIMARY KEY, content text, metadata jsonb, embedding vector(1024))`
  - `CREATE INDEX ON experience_chunks USING ivfflat (embedding vector_cosine_ops)`
- [x] Read DB connection params from `ConfigService`
- [x] Handle connection errors and reconnection

---

### 1.8 — Infrastructure: InMemoryCacheAdapter

- [x] Install `node-cache`
- [x] Create `src/infrastructure/cache/in-memory-cache.adapter.ts`:
  - Implement `ICacheProvider`
  - `get<T>(key)` — return `T | null`
  - `set<T>(key, value, ttlSeconds?)` — store with optional TTL
  - `invalidate(pattern)` — delete by key pattern (glob match)
- [x] Read default TTL from `ConfigService` (`LANDING_CACHE_TTL`)

---

### 1.9 — Module Wiring (DI)

- [x] Create `src/modules/ai.module.ts`:
  - Factory provider for `ILLMProvider` — reads `AI_LLM_PROVIDER` env, returns correct adapter
  - Factory provider for `IEmbeddingProvider` — reads `AI_EMBEDDING_PROVIDER` env
  - Exports both tokens
- [x] Create `src/modules/storage.module.ts`:
  - Factory provider for `IExperienceSource` — reads `EXPERIENCE_SOURCE` env (`markdown` | `database`)
  - Provider for `IVectorStore` — `PgVectorAdapter`
  - Provider for `IRelationalStore` (stub for now)
  - Provider for `ICacheProvider` — reads `CACHE_PROVIDER` env (`memory` | `redis`)
- [x] Create `src/modules/experience.module.ts`:
  - Imports `StorageModule`
  - Provides `ExperienceService`
  - Exports `ExperienceService`
- [x] Create `src/modules/chat.module.ts`:
  - Imports `AIModule`, `StorageModule`, `ExperienceModule`
  - Provides `ChatService`
  - Exports `ChatService`
- [x] Create `src/modules/landing.module.ts`:
  - Imports `AIModule`, `StorageModule`, `ExperienceModule`
  - Provides `LandingService`
- [x] Wire everything into `app.module.ts`
- [x] Verify `pnpm --filter api dev` starts with no DI resolution errors

---

### 1.10 — Application Layer: ChatController + ChatGateway

- [x] Create `src/application/chat/dto/send-message.dto.ts`:
  - `message: string` (min 1, max 1000)
  - `sessionId: string` (UUID)
- [x] Create `src/application/chat/chat.controller.ts`:
  - `POST /api/chat/message` — REST endpoint (non-streaming, for testing)
  - `GET /api/chat/session/:id` — retrieve chat history
  - Validate with `class-validator`
- [x] Create `src/application/chat/chat.gateway.ts` (WebSocket via `@nestjs/websockets`):
  - Event `chat:send` — receives `{ message, sessionId }`, streams response tokens via `chat:token` events
  - Event `chat:end` — signals stream completion
  - Handle client disconnect gracefully
- [x] Add `@nestjs/platform-socket.io` and configure CORS
- [x] Add global validation pipe in `main.ts`
- [x] Add rate limiting with `@nestjs/throttler` (reads `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`)

---

### 1.11 — Seed Script

- [x] Create `src/scripts/seed.ts` (or `apps/api/scripts/seed.ts`)
- [x] Script logic:
  1. Load experience chunks from `MarkdownExperienceAdapter`
  2. For each chunk: call `IEmbeddingProvider.generateEmbedding(chunk.content)`
  3. Upsert into pgvector via `IVectorStore.upsert(chunk.id, vector, chunk.metadata)`
  4. Log progress: chunk index, content preview, embedding dimensions
- [x] Add `"seed": "ts-node src/scripts/seed.ts"` to `apps/api/package.json`
- [x] Add to Turborepo pipeline as a one-off task
- [x] Verify seed runs end-to-end against a live DB instance

---

## Completion Checklist

- [x] `pnpm --filter api dev` — starts without errors
- [x] `pnpm --filter api test` — all unit tests pass
- [x] Domain services have zero imports from `infrastructure/`
- [x] WebSocket chat streams tokens to a connected client
- [x] Seed script populates pgvector with all experience chunks
- [x] Swapping `AI_LLM_PROVIDER=openai` (even if adapter is a stub) doesn't break startup
