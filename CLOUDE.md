# CLAUDE.md — experience-rag-bot

> AI-powered chatbot that answers questions about my professional experience using RAG. Features a dynamic portfolio landing and ATS CV generator. Built with NestJS, LangChain, pgvector, Next.js & React Native — Hexagonal Architecture.

---

## Project Overview

A personal platform that exposes my professional experience through multiple channels:

1. **Chat Bot (MVP)** — A RAG chatbot that answers questions about my work experience, skills, projects, and career path. If someone asks "Do you have experience with React?", the bot responds with real context: years of experience, companies, concrete projects, and metrics.
2. **Dynamic Personal Landing** — A public page that displays my experience adapted by AI based on the visitor's selected profile (Frontend, Backend, Fullstack), with smart caching.
3. **CV Generator (Final Phase)** — Given a job posting, it generates a personalized, ATS-optimized CV by selecting and prioritizing the most relevant experience.

All modules share the same **experience data core** and are designed with **Hexagonal Architecture (Ports & Adapters)** to allow swapping any external dependency without touching the business logic.

---

## Architectural Principle: Hexagonal (Ports & Adapters)

### Why Hexagonal over Clean Architecture?

Both aim to decouple, but Hexagonal fits better with NestJS:

- NestJS's **modules + providers system** maps directly to Ports (interfaces) + Adapters (injected implementations).
- Clean Architecture adds layers (entities, use cases, interface adapters, frameworks) that for a project this size would be over-engineering — you'd end up with empty folders or single-file layers.
- Hexagonal is more pragmatic: define **ports** (what I need) and **adapters** (how I solve it), and NestJS DI handles the wiring.

### Ports & Adapters Diagram

```
                    ┌──────────────────────────────────────┐
                    │          DRIVING ADAPTERS             │
                    │         (who consumes me)             │
                    │                                       │
                    │  ┌───────────┐  ┌──────────────────┐  │
                    │  │  REST API │  │ WebSocket Gateway │  │
                    │  │Controller │  │   (chat stream)   │  │
                    │  └─────┬─────┘  └────────┬─────────┘  │
                    └────────┼─────────────────┼────────────┘
                             │                 │
                             ▼                 ▼
         ════════════════════════════════════════════════════
         ║              DRIVING PORTS (interfaces)          ║
         ║                                                  ║
         ║  IChatService    ILandingService    ICVGenerator  ║
         ════════════════════╤═══════════════════════════════
                             │
                ┌────────────▼─────────────┐
                │                          │
                │     DOMAIN / CORE        │
                │                          │
                │  ChatService             │
                │  LandingService          │
                │  CVGeneratorService      │
                │  ExperienceService       │
                │                          │
                │  (Pure logic, ZERO       │
                │   infra imports)         │
                │                          │
                └────────────┬─────────────┘
                             │
         ════════════════════╤═══════════════════════════════
         ║            DRIVEN PORTS (interfaces)             ║
         ║                                                  ║
         ║  ILLMProvider          IEmbeddingProvider         ║
         ║  IVectorStore          IExperienceSource          ║
         ║  IRelationalStore      ICacheProvider             ║
         ║  ITemplateEngine                                  ║
         ════════════════════╤═══════════════════════════════
                             │
                             ▼
                    ┌──────────────────────────────────────┐
                    │          DRIVEN ADAPTERS              │
                    │       (what I depend on)              │
                    │                                       │
                    │  ┌──────────┐  ┌───────────────────┐  │
                    │  │ Bedrock  │  │    OpenAI          │  │
                    │  │ Adapter  │  │    Adapter         │  │
                    │  └──────────┘  └───────────────────┘  │
                    │  ┌──────────┐  ┌───────────────────┐  │
                    │  │ pgvector │  │  Pinecone/Chroma  │  │
                    │  │ Adapter  │  │  Adapter (future)  │  │
                    │  └──────────┘  └───────────────────┘  │
                    │  ┌──────────┐  ┌───────────────────┐  │
                    │  │ Markdown │  │  PostgreSQL        │  │
                    │  │ Adapter  │  │  Adapter (future)  │  │
                    │  └──────────┘  └───────────────────┘  │
                    │  ┌──────────┐  ┌───────────────────┐  │
                    │  │  Redis   │  │  In-Memory Cache   │  │
                    │  │  Adapter │  │  Adapter           │  │
                    │  └──────────┘  └───────────────────┘  │
                    └──────────────────────────────────────┘
```

### Port Definitions

```typescript
// ═══════════════════════════════════════════════════════════
// DRIVEN PORTS — Everything the core needs from the outside world
// ═══════════════════════════════════════════════════════════

// --- AI / LLM ---

interface ILLMProvider {
  generateResponse(prompt: string, context: string[], options?: LLMOptions): AsyncIterable<string>;
  generateStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>;
}

interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
}

interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

// --- Storage ---

interface IVectorStore {
  upsert(id: string, vector: number[], metadata: ChunkMetadata): Promise<void>;
  search(query: number[], topK: number, filter?: MetadataFilter): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<void>;
}

interface IRelationalStore {
  saveChatSession(session: ChatSession): Promise<void>;
  getChatSession(id: string): Promise<ChatSession | null>;
  saveGeneratedCV(cv: GeneratedCV): Promise<void>;
  getGeneratedCVs(filters: CVFilters): Promise<GeneratedCV[]>;
}

interface IExperienceSource {
  getAllExperience(): Promise<ExperienceData>;
  getChunks(): Promise<ExperienceChunk[]>;
}

// --- Cache ---

interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// --- Templates ---

interface ITemplateEngine {
  render(templateName: string, data: Record<string, any>): Promise<string>;
  toPDF(html: string): Promise<Buffer>;
}
```

### NestJS DI Wiring

```typescript
// apps/api/src/modules/experience.module.ts

@Module({
  providers: [
    ExperienceService,
    {
      provide: 'IExperienceSource',          // ← PORT (token)
      useClass: MarkdownExperienceAdapter,   // ← ADAPTER (MVP)
      // Future: useClass: PostgresExperienceAdapter,
    },
  ],
  exports: [ExperienceService],
})
export class ExperienceModule {}
```

```typescript
// The core NEVER imports infrastructure directly:

@Injectable()
export class ChatService {
  constructor(
    @Inject('ILLMProvider') private readonly llm: ILLMProvider,
    @Inject('IVectorStore') private readonly vectorStore: IVectorStore,
    @Inject('IEmbeddingProvider') private readonly embeddings: IEmbeddingProvider,
    private readonly experienceService: ExperienceService,
  ) {}

  async *chat(message: string, sessionId: string): AsyncIterable<string> {
    const queryVector = await this.embeddings.generateEmbedding(message);
    const relevantChunks = await this.vectorStore.search(queryVector, 5);
    const context = relevantChunks.map(r => r.content);
    yield* this.llm.generateResponse(message, context);
  }
}
```

### Swappability Map

| Port | MVP Adapter | Future Adapters | Change Required |
|------|------------|-----------------|-----------------|
| `IExperienceSource` | `MarkdownAdapter` | `PostgresAdapter` | 1 line in module |
| `ILLMProvider` | `BedrockClaudeAdapter` | `OpenAIAdapter`, `GeminiAdapter` | 1 line or env var |
| `IEmbeddingProvider` | `BedrockTitanAdapter` | `OpenAIEmbeddingAdapter`, `CohereAdapter` | 1 line or env var |
| `IVectorStore` | `PgVectorAdapter` | `PineconeAdapter`, `ChromaAdapter`, `QdrantAdapter` | 1 line or env var |
| `IRelationalStore` | `PostgresAdapter` | `MongoAdapter`, `DynamoDBAdapter` | 1 line in module |
| `ICacheProvider` | `InMemoryCacheAdapter` | `RedisCacheAdapter` | 1 line or env var |
| `ITemplateEngine` | `HandlebarsAdapter` | `ReactPDFAdapter`, `PuppeteerAdapter` | 1 line in module |

> **Golden rule**: if an `import` inside `domain/` points to `aws-sdk`, `pg`, `openai`, `@pinecone-database`, `langchain`, or any infra library → it's wrong. Those imports only exist inside `infrastructure/`.

---

## Data Strategy: Markdown-First → DB Later

### MVP Phase: Experience in Markdown

To ship the chatbot fast, experience is loaded from structured `.md` files. No DB needed to get started.

```
packages/experience-data/
  ├── markdown/
  │   ├── companies/
  │   │   ├── company-a.md
  │   │   ├── company-b.md
  │   │   └── company-c.md
  │   ├── projects/
  │   │   ├── project-x.md
  │   │   └── project-y.md
  │   ├── skills.md
  │   ├── education.md
  │   └── summary.md
  ├── parser.ts              # Parses MD → ExperienceData
  ├── chunker.ts             # Splits into chunks for embeddings
  └── package.json
```

### Markdown Format

```markdown
<!-- packages/experience-data/markdown/companies/company-a.md -->

---
id: company-a
name: Company A
industry: Fintech
location: Buenos Aires, Argentina
role: Senior Frontend Engineer
roleLevel: senior
startDate: 2020-03-01
endDate: 2023-06-30
---

## Responsibilities

- Led a 5-person frontend team for the B2B payments platform
- Designed and implemented the shared design system across 3 products
- Migrated the main app from Angular to React, reducing bundle size by 40%

## Achievements

### Angular → React Migration
- **Impact**: Reduced bundle size by 40% and initial load time by 2.5s
- **Metrics**: LCP went from 4.2s to 1.7s, TTI from 6s to 2.8s
- **Skills**: React, TypeScript, Webpack, Performance Optimization
- **Team**: 5 developers, 3 months

### Design System
- **Impact**: Unified UI across 3 products, reducing UI bugs by 60%
- **Metrics**: 45 components, 92% coverage, adopted by 3 teams
- **Skills**: React, Storybook, CSS-in-JS, Design Tokens
- **Team**: 2 developers, 6 months

## Tech Stack
React, TypeScript, Next.js, Webpack, Storybook, Jest, Cypress,
GraphQL, Apollo Client, AWS (S3, CloudFront, Lambda)
```

```markdown
<!-- packages/experience-data/markdown/skills.md -->

---
type: skills
---

## Frontend
- **React** | expert | 12 years | Used in production at Company A, B, C
- **TypeScript** | expert | 8 years | Standard in all my projects since 2016
- **Next.js** | advanced | 5 years | SSR/SSG at Company A and Company B

## Backend
- **Node.js** | advanced | 10 years | REST and GraphQL APIs in production
- **NestJS** | advanced | 4 years | Hexagonal architecture at Company C

## Mobile
- **React Native** | intermediate | 3 years | Company B app (iOS + Android)
```

### MarkdownAdapter

```typescript
@Injectable()
export class MarkdownExperienceAdapter implements IExperienceSource {
  private cachedData: ExperienceData | null = null;

  async getAllExperience(): Promise<ExperienceData> {
    if (this.cachedData) return this.cachedData;
    const companies = await this.parseDirectory('companies');
    const projects = await this.parseDirectory('projects');
    const skills = await this.parseFile('skills.md');
    const education = await this.parseFile('education.md');
    this.cachedData = { companies, projects, skills, education };
    return this.cachedData;
  }

  async getChunks(): Promise<ExperienceChunk[]> {
    const data = await this.getAllExperience();
    return this.chunkExperience(data);
    // ~30-60 chunks for a typical CV
  }
}
```

### Migration to DB

```typescript
// Just swap the adapter in the module:
// BEFORE: { provide: 'IExperienceSource', useClass: MarkdownExperienceAdapter }
// AFTER:  { provide: 'IExperienceSource', useClass: PostgresExperienceAdapter }
```

> **When to migrate?** When you need: admin UI to edit experience, data versioning, or frequently changing data. For a personal CV, Markdown might be the definitive solution.

---

## Dynamic Personal Landing

### Concept

The landing is my public personal site. It has classic sections (hero, about, experience, skills, projects, contact) but the content **adapts dynamically** based on the visitor's selected profile.

### Dynamic Tabs Flow

```
Visitor arrives at mydomain.com
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  LANDING PAGE                                         │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  HERO: Name, title, photo                       │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────┬────────────┬────────────┐            │
│  │  Frontend  │  Backend   │ Fullstack  │  ← TABS   │
│  │  ████████  │            │            │            │
│  └────────────┴────────────┴────────────┘            │
│         │                                             │
│         ▼                                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │  DYNAMIC CONTENT (AI-generated)                 │  │
│  │                                                  │  │
│  │  - Summary rewritten for Frontend profile        │  │
│  │  - Prioritized skills: React, Next.js, CSS...   │  │
│  │  - Experience reordered by FE relevance          │  │
│  │  - Projects filtered: FE-only                    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌──────────────────────────┐                         │
│  │  💬 Chat Widget          │  ← Always visible      │
│  │  "Ask me anything..."    │                         │
│  └──────────────────────────┘                         │
└──────────────────────────────────────────────────────┘
```

### Backend: LandingService

```typescript
@Injectable()
export class LandingService {
  constructor(
    @Inject('ILLMProvider') private readonly llm: ILLMProvider,
    @Inject('ICacheProvider') private readonly cache: ICacheProvider,
    @Inject('IExperienceSource') private readonly experience: IExperienceSource,
  ) {}

  async getProfileContent(profile: 'frontend' | 'backend' | 'fullstack'): Promise<LandingContent> {
    const cacheKey = `landing:profile:${profile}`;
    const cached = await this.cache.get<LandingContent>(cacheKey);
    if (cached) return cached;

    const experience = await this.experience.getAllExperience();
    const content = await this.generateProfileContent(profile, experience);
    await this.cache.set(cacheKey, content, 86400); // 24h TTL
    return content;
  }
}
```

### Caching Strategy

```
Request: GET /api/landing/frontend
              │
     ┌────────▼────────┐
     │   Cache hit?     │
     └───┬──────────┬───┘
      YES│          │NO
         ▼          ▼
   Return cached   1. Load experience (IExperienceSource)
   (~5ms)          2. Call LLM (ILLMProvider.generateStructured)
                   3. Save to cache (ICacheProvider)
                   4. Return (~3-5s first time only)

Invalidation:
- TTL: 24h auto-expires
- Manual: POST /api/landing/cache/invalidate
- Warm-up: post-deploy script pre-generates all 3 profiles
```

### Frontend: Next.js ISR

```
1. BUILD TIME: Calls /api/landing/frontend, /backend, /fullstack
   → Generates 3 pre-rendered static versions

2. RUNTIME: Static HTML served from CDN (~50ms TTFB)
   → Tab switch is instant (data already pre-fetched)
   → Chat widget hydrates client-side

3. REVALIDATION: ISR every 24h re-validates against the API
```

### API Endpoints

```
GET  /api/landing/:profile          → Adapted content (frontend|backend|fullstack)
GET  /api/landing/base              → Raw data without adaptation (SEO/SSG)
POST /api/landing/cache/invalidate  → Regenerate cache (protected with API key)
```

---

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
│  ┌──────────┐    ┌──────────┐    ┌────────────────────────┐  │
│  │  Next.js  │    │  React   │    │  Others (future)       │  │
│  │  Web App  │    │  Native  │    │  LinkedIn, Notion...   │  │
│  └────┬─────┘    └────┬─────┘    └────────┬───────────────┘  │
└───────┼───────────────┼───────────────────┼──────────────────┘
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (NestJS) — Hexagonal                │
│                                                              │
│   DRIVING ADAPTERS ─────────────────────────────────────     │
│   │ ChatController  LandingController  CVController  │       │
│   │ ChatGateway(WS)                                  │       │
│   └──────────────────────┬───────────────────────────┘       │
│                          │                                   │
│   DOMAIN (CORE) ─────────▼──────────────────────────         │
│   │  ChatService         LandingService              │       │
│   │  CVGeneratorService  ExperienceService           │       │
│   │  Ports only, ZERO infra dependencies             │       │
│   └──────────────────────┬───────────────────────────┘       │
│                          │                                   │
│   DRIVEN ADAPTERS ───────▼──────────────────────────         │
│   │ AI: Bedrock | OpenAI | Gemini                    │       │
│   │ Storage: pgvector | Markdown | Postgres          │       │
│   │ Cache: InMemory | Redis                          │       │
│   │ Templates: Handlebars                            │       │
│   └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
experience-rag-bot/
├── CLAUDE.md
├── README.md
├── package.json                          # pnpm workspaces
├── turbo.json
├── .github/workflows/
│
├── packages/
│   ├── shared-types/
│   │   └── src/
│   │       ├── experience.ts
│   │       ├── chat.ts
│   │       ├── landing.ts
│   │       ├── cv.ts                     # Phase 5
│   │       ├── ports.ts                  # ALL port interfaces
│   │       └── index.ts
│   │
│   └── experience-data/                  # MY EXPERIENCE (source of truth)
│       ├── markdown/                     # ← Data in .md (MVP)
│       │   ├── companies/
│       │   ├── projects/
│       │   ├── skills.md
│       │   ├── education.md
│       │   └── summary.md
│       ├── parser.ts
│       ├── chunker.ts
│       └── package.json
│
├── apps/
│   ├── api/                              # NestJS Backend
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       │
│   │       │  # ══════ DOMAIN (CORE) ══════
│   │       ├── domain/
│   │       │   ├── ports/                # Pure interfaces
│   │       │   │   ├── llm-provider.port.ts
│   │       │   │   ├── embedding-provider.port.ts
│   │       │   │   ├── vector-store.port.ts
│   │       │   │   ├── experience-source.port.ts
│   │       │   │   ├── relational-store.port.ts
│   │       │   │   ├── cache-provider.port.ts
│   │       │   │   └── template-engine.port.ts
│   │       │   ├── services/
│   │       │   │   ├── chat.service.ts
│   │       │   │   ├── experience.service.ts
│   │       │   │   ├── landing.service.ts
│   │       │   │   └── cv-generator.service.ts       # Phase 5
│   │       │   └── model/
│   │       │       ├── experience-chunk.ts
│   │       │       ├── chat-session.ts
│   │       │       └── landing-content.ts
│   │       │
│   │       │  # ══════ INFRASTRUCTURE (DRIVEN ADAPTERS) ══════
│   │       ├── infrastructure/
│   │       │   ├── ai/
│   │       │   │   ├── bedrock-claude.adapter.ts
│   │       │   │   ├── bedrock-titan-embedding.adapter.ts
│   │       │   │   ├── openai.adapter.ts             # future
│   │       │   │   ├── openai-embedding.adapter.ts   # future
│   │       │   │   └── gemini.adapter.ts             # future
│   │       │   ├── storage/
│   │       │   │   ├── pgvector.adapter.ts
│   │       │   │   ├── postgres-relational.adapter.ts
│   │       │   │   └── markdown-experience.adapter.ts
│   │       │   ├── cache/
│   │       │   │   ├── in-memory-cache.adapter.ts
│   │       │   │   └── redis-cache.adapter.ts        # future
│   │       │   └── templates/
│   │       │       ├── handlebars.adapter.ts
│   │       │       └── templates/
│   │       │
│   │       │  # ══════ APPLICATION (DRIVING ADAPTERS) ══════
│   │       ├── application/
│   │       │   ├── chat/
│   │       │   │   ├── chat.controller.ts
│   │       │   │   ├── chat.gateway.ts
│   │       │   │   └── dto/
│   │       │   ├── landing/
│   │       │   │   ├── landing.controller.ts
│   │       │   │   └── dto/
│   │       │   └── cv-generator/                     # Phase 5
│   │       │
│   │       │  # ══════ MODULE WIRING ══════
│   │       └── modules/
│   │           ├── experience.module.ts
│   │           ├── chat.module.ts
│   │           ├── landing.module.ts
│   │           ├── ai.module.ts           # Factory: LLM + Embeddings
│   │           └── storage.module.ts      # Factory: Vector + Relational
│   │
│   ├── web/                              # Next.js Frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx              # Dynamic landing with tabs
│   │       │   ├── chat/page.tsx
│   │       │   └── cv-generator/page.tsx # Phase 5
│   │       ├── components/
│   │       │   ├── landing/
│   │       │   │   ├── Hero.tsx
│   │       │   │   ├── ProfileTabs.tsx
│   │       │   │   ├── DynamicExperience.tsx
│   │       │   │   ├── DynamicSkills.tsx
│   │       │   │   ├── DynamicProjects.tsx
│   │       │   │   └── ChatWidget.tsx
│   │       │   ├── chat/
│   │       │   │   ├── ChatWindow.tsx
│   │       │   │   ├── MessageBubble.tsx
│   │       │   │   └── SuggestedQuestions.tsx
│   │       │   └── ui/
│   │       ├── hooks/
│   │       │   ├── useChat.ts
│   │       │   ├── useStreamResponse.ts
│   │       │   └── useLandingProfile.ts
│   │       └── lib/api-client.ts
│   │
│   └── mobile/                           # React Native (Expo)
│       └── src/
│           ├── screens/
│           ├── components/chat/
│           └── hooks/useChat.ts
│
└── infra/
    ├── cdk/
    └── docker-compose.yml
```

---

## Data Models

```typescript
// packages/shared-types/src/experience.ts

interface ExperienceData {
  summary: string;
  companies: Company[];
  projects: Project[];
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
}

interface Company {
  id: string;
  name: string;
  description: string;
  industry: string;
  location: string;
  startDate: Date;
  endDate: Date | null;
  role: string;
  roleLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'staff';
  responsibilities: string[];
  achievements: Achievement[];
  techStack: string[];
}

interface Achievement {
  description: string;
  impact: string;
  metrics?: string[];
  skills: string[];
}

interface Skill {
  name: string;
  category: 'frontend' | 'backend' | 'devops' | 'database' | 'mobile' | 'tools' | 'soft';
  yearsOfExperience: number;
  proficiency: 'basic' | 'intermediate' | 'advanced' | 'expert';
  context: string[];
  relatedProjects: string[];
}

interface ExperienceChunk {
  id: string;
  content: string;
  metadata: {
    type: 'company' | 'project' | 'skill' | 'achievement' | 'education';
    companyId?: string;
    projectId?: string;
    skills: string[];
    dateRange?: { start: Date; end: Date };
  };
}

// packages/shared-types/src/landing.ts

type ProfileType = 'frontend' | 'backend' | 'fullstack';

interface LandingContent {
  profile: ProfileType;
  summary: string;
  highlightedSkills: LandingSkill[];
  experience: LandingExperience[];
  featuredProjects: LandingProject[];
  generatedAt: Date;
}
```

---

## RAG Pipeline (Chat)

```
User: "Do you have experience with React?"
         │
         ▼
1. IEmbeddingProvider.generateEmbedding(query)
         │
         ▼
2. IVectorStore.search(queryVector, topK=5)
         │
         ▼
3. ExperienceService.assembleContext(chunks)
         │
         ▼
4. ILLMProvider.generateResponse(prompt, context)  ←  streaming
         │
         ▼
5. WebSocket/SSE → Client
```

### Bot System Prompt

```
You are an assistant representing [MY NAME]'s professional experience.
Respond in first person as if you were [MY NAME] talking about their career.
Use ONLY the information provided in the context.
If you don't have enough information, say "I don't have that information in my profile"
instead of making things up.
Be concise but detailed when relevant data is available.
Include concrete examples: companies, projects, technologies, metrics.
```

---

## CV Generator (Phase 5)

```
Job Posting → JobParser (ILLMProvider) → ExperienceMatching (IVectorStore)
→ ATSOptimizer (ILLMProvider.generateStructured) → TemplateEngine (ITemplateEngine)
→ Downloadable PDF
```

### Module Comparison

| Aspect | Chat Bot | Dynamic Landing | CV Generator |
|--------|----------|----------------|--------------|
| **Input** | Free-form question | Profile (FE/BE/Full) | Job posting |
| **Retrieval** | Semantic search | Full data + LLM filters | Semantic + structured filters |
| **LLM** | Conversational stream | Structured output (batch) | Structured (batch) |
| **Output** | Streaming text | JSON → UI components | PDF document |
| **Cache** | Chat history | 24h per profile | Per job posting |
| **Latency** | ~1-3s | Cache: ~5ms / Cold: ~3-5s | ~10-15s |

---

## Tech Stack

### Backend (NestJS)
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10+
- **ORM**: TypeORM (pgvector support)
- **LangChain**: ONLY inside AI adapters, never in domain
- **LLM (MVP)**: Amazon Bedrock (Claude Haiku)
- **Embeddings (MVP)**: Amazon Titan Embeddings v2
- **Cache (MVP)**: In-memory (node-cache)
- **MD Parsing**: gray-matter + remark
- **Validation**: class-validator, Zod (LLM output)

### Frontend (Next.js)
- **Framework**: Next.js 14+ (App Router)
- **Rendering**: ISR for landing, CSR for chat
- **Styling**: Tailwind CSS
- **State**: React Query + Zustand
- **Animations**: Framer Motion (tab transitions)

### Mobile (React Native)
- **Framework**: Expo SDK 50+ with Expo Router
- **Build**: EAS Build

### Database
- **PostgreSQL 15+** with **pgvector** extension

---

## AWS Infrastructure (~$100 USD budget)

| Service | Config | Est. Cost |
|---------|--------|-----------|
| RDS PostgreSQL | db.t4g.micro, 20GB | ~$15/mo |
| ECS Fargate | 0.25 vCPU, 0.5GB, spot | ~$8/mo |
| Bedrock (Claude Haiku) | ~1000 queries/mo | ~$2-5/mo |
| Bedrock (Titan Embeddings) | Seed + queries | ~$1/mo |
| S3 + CloudFront | Static hosting | ~$1/mo |
| API Gateway | HTTP API | ~$1/mo |
| ECR | 1 image | ~$0.50/mo |
| **TOTAL** | | **~$28-31/mo** |

### Ultra-Economical Alternative (~$5/mo)
- EC2 t3.micro (free tier): Docker Compose with everything
- Bedrock: pay-per-use only
- S3: static hosting

---

## Development Roadmap

### Phase 1: Backend + Chat Bot (Weeks 1-3)

1. Monorepo setup (Turborepo + pnpm workspaces)
2. `packages/shared-types` — Interfaces + Ports
3. `packages/experience-data` — Write all experience in Markdown
4. `apps/api` domain/ports — Define all interfaces
5. `apps/api` infrastructure — MarkdownAdapter, BedrockAdapters, PgVectorAdapter
6. `apps/api` domain/services — ChatService, ExperienceService
7. `apps/api` application — ChatController, ChatGateway (WebSocket)
8. Docker Compose — PostgreSQL + pgvector + API
9. Seed script — Parse MD → generate embeddings → populate pgvector
10. Tests — Unit tests for services (mocking ports)

### Phase 2: Web Frontend + Chat UI (Weeks 4-5)

1. `apps/web` — Next.js App Router setup
2. Chat UI — ChatWindow, MessageBubble, streaming display
3. Chat page — `/chat` fullscreen
4. Basic landing — Hero + About + chat link (static for now)
5. Deploy — S3 + CloudFront

### Phase 3: Dynamic Landing (Weeks 5-6)

1. `apps/api` LandingService — Profile-based content generation with cache
2. `apps/api` LandingController — Endpoints
3. Landing components — ProfileTabs, DynamicExperience, DynamicSkills
4. ISR setup — Pre-generate 3 profiles at build time
5. Cache warm-up — Post-deploy script
6. ChatWidget — Floating widget on landing

### Phase 4: Mobile App (Weeks 7-8)

1. `apps/mobile` — Expo + Expo Router
2. Reuse hooks — useChat with same interface as web
3. Native chat UI
4. EAS Build

### Phase 5: CV Generator (Weeks 9-11)

1. CVGeneratorService — Job parsing + ATS optimization
2. TemplateEngine — Handlebars → PDF
3. Frontend — Job posting input + preview + download
4. Mobile — CV Generator screen

---

## Conventions

### Code
- **Code language**: English (variables, functions, types, technical comments)
- **Content language**: English (UI text, experience data, documentation)
- **Formatting**: Prettier + ESLint (shared config at root)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches**: `main` → production, `feature/*` → features, `fix/*` → bug fixes

### Git Workflow

| Phase | Workflow | Reason |
|-------|----------|--------|
| Stage 0 (steps 0.1–0.5) | Push directly to main | No CI yet — pure scaffolding, nothing to break |
| Stage 1 onwards | `feature/*` branch → PR → merge | CI is live; PRs enforce typecheck + lint + tests before landing on main |

**Switch point:** After step 0.5 (CI pipeline live and green on main), every change goes through a PR.

```bash
git checkout -b feature/<step-name>   # step names defined in roadmap/
# work the step
git push origin feature/<step-name>
# open PR → CI runs → merge to main
```

- Each PR maps to exactly one roadmap step → clean, navigable git history
- The PR diff serves as a self code-review before merging
- Branch names follow the commit names already defined in `roadmap/`

### Hexagonal Architecture — Strict Rules
- `domain/` NEVER imports from `infrastructure/` or `application/`
- `domain/ports/` contains ONLY interfaces (no classes, no implementations)
- `domain/services/` uses ONLY port injection via constructor
- `infrastructure/` implements ports, may import external libs (aws-sdk, pg, langchain)
- `application/` orchestrates, handles HTTP/WS, validates DTOs, delegates to domain services
- `modules/` is the ONLY place where port → adapter wiring happens
- LangChain lives ONLY inside AI adapters, never in domain

### Testing
- **Domain services**: Pure unit tests, mocking all ports
- **Adapters**: Integration tests (test containers)
- **Controllers**: E2E tests with Supertest

---

## Environment Variables

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cvbot
DATABASE_USER=cvbot
DATABASE_PASSWORD=

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# AI Provider Selection
AI_LLM_PROVIDER=bedrock              # bedrock | openai | gemini
AI_EMBEDDING_PROVIDER=bedrock        # bedrock | openai | cohere

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0

# OpenAI (when used)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Experience Source
EXPERIENCE_SOURCE=markdown            # markdown | database

# Cache
CACHE_PROVIDER=memory                 # memory | redis
REDIS_URL=redis://localhost:6379

# App
API_PORT=3000
CORS_ORIGINS=http://localhost:3001
WS_PORT=3002

# Landing
LANDING_CACHE_TTL=86400

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=20
```

---

## Provider Factory Pattern

```typescript
// apps/api/src/modules/ai.module.ts

@Module({
  providers: [
    {
      provide: 'ILLMProvider',
      useFactory: (config: ConfigService) => {
        switch (config.get('AI_LLM_PROVIDER')) {
          case 'openai':   return new OpenAIAdapter(config);
          case 'gemini':   return new GeminiAdapter(config);
          default:         return new BedrockClaudeAdapter(config);
        }
      },
      inject: [ConfigService],
    },
    {
      provide: 'IEmbeddingProvider',
      useFactory: (config: ConfigService) => {
        switch (config.get('AI_EMBEDDING_PROVIDER')) {
          case 'openai':   return new OpenAIEmbeddingAdapter(config);
          case 'cohere':   return new CohereEmbeddingAdapter(config);
          default:         return new BedrockTitanEmbeddingAdapter(config);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['ILLMProvider', 'IEmbeddingProvider'],
})
export class AIModule {}
```

---

## Useful Commands

```bash
# Local development
docker compose up -d postgres
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter mobile start

# Seed data
pnpm --filter experience-data seed

# Testing
pnpm --filter api test
pnpm --filter api test:e2e
pnpm turbo test

# Cache management
curl -X POST localhost:3000/api/landing/cache/invalidate -H "x-api-key: $KEY"

# Switch AI provider without touching code
AI_LLM_PROVIDER=openai pnpm --filter api dev
```

---

## Technical Decisions & Rationale

**Why Hexagonal over Clean Architecture?**
NestJS has native DI that maps perfectly to Ports & Adapters. Clean Architecture would add unnecessary layers for a project this size.

**Why Markdown-first for experience?**
MVP speed. Writing `.md` files is immediate — no schema migrations, no seeds, no admin UI needed. Swapping to a PostgresAdapter is a one-line change. For a personal CV, Markdown might be the forever solution.

**Why does LangChain live in adapters, not in domain?**
If LangChain is in the core, you're coupled to its API. Tomorrow if you want to use Vercel AI SDK or raw OpenAI/Bedrock SDKs, you'd have to rewrite business logic. With LangChain in adapters, the core only knows `ILLMProvider.generateResponse()`.

**Why generate landing content with AI instead of hardcoding?**
The data already exists in my experience. Maintaining 3 manual versions is tedious and gets out of sync. With AI + cache, I update the `.md` files and the landing regenerates itself adapted to each profile.

**Why in-memory cache instead of Redis from day one?**
Low traffic → `node-cache` is enough. Redis adds another service to maintain and pay for. When scaling is needed, swap the adapter to Redis without touching the core.

**Why pgvector instead of Pinecone/Weaviate?**
A single database for everything. ~50-100 chunks from a CV don't need more.

**Why monorepo with Turborepo?**
Shared types, centralized experience data, automatic build caching.