# Stage 0 — Monorepo Base

> **Goal:** A fully functional repository with shared tooling configured and shared packages bootstrapped. No business logic yet.
>
> **Deliverable:** `pnpm turbo typecheck` passes green across all packages.

---

## Steps

### 0.1 — Initialize Turborepo + pnpm workspaces

- [ ] Run `pnpm dlx create-turbo@latest` or scaffold manually
- [ ] Configure `pnpm-workspace.yaml` to include `apps/*` and `packages/*`
- [ ] Add root `package.json` with `"packageManager": "pnpm@x.x.x"`
- [ ] Add `turbo.json` with pipelines: `build`, `dev`, `typecheck`, `lint`, `test`
- [ ] Verify `pnpm install` resolves without errors

```
Commit: feature/monorepo-init
Description: Initialize Turborepo monorepo with pnpm workspaces. Configures
pipeline tasks (build, dev, typecheck, lint, test) and workspace glob patterns
for apps/* and packages/*.
```

---

### 0.2 — Shared TypeScript + Lint + Format config

- [ ] Create `packages/tsconfig/` with:
  - `base.json` — strict mode, `ES2022`, `bundler` module resolution
  - `nestjs.json` — extends base, adds NestJS decorators config (`emitDecoratorMetadata`, `experimentalDecorators`)
  - `nextjs.json` — extends base, adds JSX and Next.js paths
  - `react-native.json` — extends base for Expo/RN
- [ ] Create `packages/eslint-config/` with:
  - `base.js` — TypeScript rules, import order, no unused vars
  - `nestjs.js` — extends base
  - `next.js` — extends base + Next.js plugin
- [ ] Add root `.prettierrc` and `.prettierignore`
- [ ] Add root `.editorconfig`
- [ ] Verify `pnpm turbo typecheck` and `pnpm turbo lint` run (even with empty packages)

```
Commit: feature/shared-tooling
Description: Add shared TypeScript configs and ESLint/Prettier configurations
as internal packages. Each app extends the relevant preset to ensure consistent
code style and strict type-checking across the monorepo.
```

---

### 0.3 — `packages/shared-types` — Interfaces and Port definitions

- [ ] Scaffold `packages/shared-types/package.json` with correct `name`, `main`, and `exports`
- [ ] Create `src/experience.ts`:
  - `ExperienceData`, `Company`, `Project`, `Skill`, `Education`, `Certification`, `Achievement`
- [ ] Create `src/chat.ts`:
  - `ChatSession`, `ChatMessage`, `ChatRole`
- [ ] Create `src/landing.ts`:
  - `ProfileType`, `LandingContent`, `LandingSkill`, `LandingExperience`, `LandingProject`
- [ ] Create `src/cv.ts`:
  - `GeneratedCV`, `CVFilters`, `JobPosting` (Phase 5 — define shape, leave empty stubs)
- [ ] Create `src/ports.ts` — ALL driven port interfaces:
  - `ILLMProvider`, `LLMOptions`
  - `IEmbeddingProvider`
  - `IVectorStore`, `VectorSearchResult`, `ChunkMetadata`, `MetadataFilter`
  - `IRelationalStore`
  - `IExperienceSource`, `ExperienceChunk`
  - `ICacheProvider`
  - `ITemplateEngine`
- [ ] Create `src/index.ts` — re-export everything
- [ ] Add `tsconfig.json` extending `packages/tsconfig/base.json`
- [ ] Verify `pnpm --filter shared-types typecheck` passes

```
Commit: feature/shared-types
Description: Add shared-types package with all domain interfaces, data models,
and port definitions (ILLMProvider, IVectorStore, IExperienceSource, etc.).
This package is the single source of truth for types shared across apps.
```

---

### 0.4 — `packages/experience-data` — Markdown experience files

- [ ] Scaffold `packages/experience-data/package.json`
- [ ] Create `markdown/` directory structure:
  ```
  markdown/
  ├── companies/
  │   ├── company-a.md
  │   └── company-b.md
  ├── projects/
  │   ├── project-x.md
  │   └── project-y.md
  ├── skills.md
  ├── education.md
  └── summary.md
  ```
- [ ] Write each `.md` file with YAML frontmatter + structured content sections (Responsibilities, Achievements, Tech Stack)
- [ ] Install `gray-matter` and `remark` as dependencies
- [ ] Create `parser.ts` — reads `.md` files, parses frontmatter, returns `ExperienceData`
- [ ] Create `chunker.ts` — splits `ExperienceData` into `ExperienceChunk[]` (~30-60 chunks)
- [ ] Add `tsconfig.json` extending `packages/tsconfig/base.json`
- [ ] Verify `pnpm --filter experience-data typecheck` passes

```
Commit: feature/experience-data
Description: Add experience-data package with all professional experience written
in structured Markdown files. Includes parser (gray-matter + remark) and chunker
that produces ExperienceChunk[] ready for embedding ingestion.
```

---

### 0.5 — CI Pipeline (GitHub Actions)

- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure trigger on `push` to `main`/`develop` and on `pull_request`
- [ ] Add jobs:
  - `typecheck` — runs `pnpm turbo typecheck`
  - `lint` — runs `pnpm turbo lint`
  - `test` — runs `pnpm turbo test` (empty for now, will fill in later stages)
- [ ] Add pnpm caching using `actions/cache` with `pnpm-lock.yaml` key
- [ ] Add Turborepo remote cache (optional: Vercel remote cache or self-hosted)
- [ ] Verify workflow runs green on a test push

```
Commit: feature/ci-pipeline
Description: Add GitHub Actions CI workflow with typecheck, lint, and test jobs.
Uses pnpm caching and Turborepo task caching to minimize redundant work on
repeated runs.
```

---

## Completion Checklist

- [ ] `pnpm install` — no errors
- [ ] `pnpm turbo typecheck` — green
- [ ] `pnpm turbo lint` — green
- [ ] `packages/shared-types` exports all interfaces and port definitions
- [ ] `packages/experience-data` has real experience data and a working parser
- [ ] CI workflow runs on GitHub without failures
