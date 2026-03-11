# Stage 0 — Monorepo Base

> **Goal:** A fully functional repository with shared tooling configured and shared packages bootstrapped. No business logic yet.
>
> **Deliverable:** `pnpm turbo typecheck` passes green across all packages.

---

## Steps

### 0.1 — Initialize Turborepo + pnpm workspaces

- [x] Run `pnpm dlx create-turbo@latest` or scaffold manually
- [x] Configure `pnpm-workspace.yaml` to include `apps/*` and `packages/*`
- [x] Add root `package.json` with `"packageManager": "pnpm@x.x.x"`
- [x] Add `turbo.json` with pipelines: `build`, `dev`, `typecheck`, `lint`, `test`
- [x] Verify `pnpm install` resolves without errors

---

### 0.2 — Shared TypeScript + Lint + Format config

- [x] Create `packages/tsconfig/` with:
  - `base.json` — strict mode, `ES2022`, `bundler` module resolution
  - `nestjs.json` — extends base, adds NestJS decorators config (`emitDecoratorMetadata`, `experimentalDecorators`)
  - `nextjs.json` — extends base, adds JSX and Next.js paths
  - `react-native.json` — extends base for Expo/RN
- [x] Create `packages/eslint-config/` with:
  - `base.js` — TypeScript rules, import order, no unused vars
  - `nestjs.js` — extends base
  - `next.js` — extends base + Next.js plugin
- [x] Add root `.prettierrc` and `.prettierignore`
- [x] Add root `.editorconfig`
- [x] Verify `pnpm turbo typecheck` and `pnpm turbo lint` run (even with empty packages)

---

### 0.3 — `packages/shared-types` — Interfaces and Port definitions

- [x] Scaffold `packages/shared-types/package.json` with correct `name`, `main`, and `exports`
- [x] Create `src/experience.ts`:
  - `ExperienceData`, `Company`, `Project`, `Skill`, `Education`, `Certification`, `Achievement`
- [x] Create `src/chat.ts`:
  - `ChatSession`, `ChatMessage`, `ChatRole`
- [x] Create `src/landing.ts`:
  - `ProfileType`, `LandingContent`, `LandingSkill`, `LandingExperience`, `LandingProject`
- [x] Create `src/cv.ts`:
  - `GeneratedCV`, `CVFilters`, `JobPosting` (Phase 5 — define shape, leave empty stubs)
- [x] Create `src/ports.ts` — ALL driven port interfaces:
  - `ILLMProvider`, `LLMOptions`
  - `IEmbeddingProvider`
  - `IVectorStore`, `VectorSearchResult`, `ChunkMetadata`, `MetadataFilter`
  - `IRelationalStore`
  - `IExperienceSource`, `ExperienceChunk`
  - `ICacheProvider`
  - `ITemplateEngine`
- [x] Create `src/index.ts` — re-export everything
- [x] Add `tsconfig.json` extending `packages/tsconfig/base.json`
- [x] Verify `pnpm --filter shared-types typecheck` passes

---

### 0.4 — `packages/experience-data` — Markdown experience files

- [x] Scaffold `packages/experience-data/package.json`
- [x] Create `markdown/` directory structure:
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
- [x] Write each `.md` file with YAML frontmatter + structured content sections (Responsibilities, Achievements, Tech Stack)
- [x] Install `gray-matter` and `remark` as dependencies
- [x] Create `parser.ts` — reads `.md` files, parses frontmatter, returns `ExperienceData`
- [x] Create `chunker.ts` — splits `ExperienceData` into `ExperienceChunk[]` (~30-60 chunks)
- [x] Add `tsconfig.json` extending `packages/tsconfig/base.json`
- [x] Verify `pnpm --filter experience-data typecheck` passes

---

### 0.5 — CI Pipeline (GitHub Actions)

- [x] Create `.github/workflows/ci.yml`
- [x] Configure trigger on `push` to `main`/`develop` and on `pull_request`
- [x] Add jobs:
  - `typecheck` — runs `pnpm turbo typecheck`
  - `lint` — runs `pnpm turbo lint`
  - `test` — runs `pnpm turbo test` (empty for now, will fill in later stages)
- [x] Add pnpm caching using `actions/cache` with `pnpm-lock.yaml` key
- [x] Add Turborepo remote cache (optional: Vercel remote cache or self-hosted)
- [x] Verify workflow runs green on a test push

---

## Completion Checklist

- [x] `pnpm install` — no errors
- [x] `pnpm turbo typecheck` — green
- [x] `pnpm turbo lint` — green
- [x] `packages/shared-types` exports all interfaces and port definitions
- [x] `packages/experience-data` has real experience data and a working parser
- [x] CI workflow runs on GitHub without failures
