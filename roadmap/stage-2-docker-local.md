# Stage 2 — Local Infrastructure (Docker)

> **Goal:** The entire stack runs with a single `docker compose up` command. No manual setup required beyond copying `.env.example`.
>
> **Deliverable:** `docker compose up` brings up PostgreSQL + pgvector + NestJS API. The seed script can be run as a one-off container. The chat endpoint responds correctly.
>
> **Depends on:** Stage 1 complete (API builds successfully)

---

## Steps

### 2.1 — PostgreSQL + pgvector Docker Compose (DB only)

- [x] Create `infra/docker-compose.yml`
- [x] Add `postgres` service:
  - Image: `pgvector/pgvector:pg16`
  - Environment: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from `.env`
  - Ports: `5432:5432`
  - Volume: `postgres_data:/var/lib/postgresql/data` (named volume for persistence)
  - Health check: `pg_isready -U $POSTGRES_USER`
- [x] Add `adminer` service (optional dev UI):
  - Image: `adminer`
  - Ports: `8080:8080`
  - Profile: `tools` (only starts with `--profile tools`)
- [x] Create `infra/postgres/init.sql`:
  - `CREATE EXTENSION IF NOT EXISTS vector;`
  - Create `experience_chunks` table with `vector(1024)` column
  - Create ivfflat index
- [x] Mount `init.sql` as `/docker-entrypoint-initdb.d/init.sql`

---

### 2.2 — Dockerfile for `apps/api` (multi-stage)

- [x] Create `apps/api/Dockerfile`:
  - **Stage 1 `base`**: `node:20-alpine`, install pnpm, set workdir
  - **Stage 2 `deps`**: copy `pnpm-lock.yaml` + all `package.json` files, run `pnpm install --frozen-lockfile`
  - **Stage 3 `build`**: copy source, build shared-types, experience-data, api
  - **Stage 4 `runner`**: copy only `dist/` and `node_modules/` from previous stages, expose port, set `CMD`
- [x] Add `.dockerignore` at repo root

---

### 2.3 — Full Docker Compose (API + DB)

- [x] Add `api` service to `infra/docker-compose.yml`:
  - Build context: repo root, Dockerfile: `apps/api/Dockerfile`
  - Environment: read from `.env` file (use `env_file`)
  - Ports: `3001:3001` (REST + WebSocket on same port, namespace `/chat`)
  - `depends_on` with condition `service_healthy` for `postgres`
  - Restart policy: `unless-stopped`
- [x] Add `seed` service:
  - Same image as `api`
  - Command override: `node dist/scripts/seed.js`
  - `depends_on: api` with condition `service_healthy`
  - `restart: no` (run once)
  - Profile: `seed` (only runs with `--profile seed`)
- [x] Add health check for `api` service: `GET /api/health`
- [x] Add health endpoint `GET /api/health` in NestJS:
  - Returns `{ status: 'ok', timestamp: ... }`

---

### 2.4 — Environment Setup Documentation

- [x] Create root `.env.example` with all required variables grouped by section
- [x] Ensure `.env` and `.env.local` are in `.gitignore`
- [x] Create `infra/docker-compose.override.yml` for local dev overrides:
  - Mount `apps/api/src` as volume for hot reload (development only)
  - Override CMD to `pnpm dev`

---

### 2.5 — Health Checks + Startup Reliability

- [x] Add native retry logic in `PgVectorAdapter.onModuleInit()`:
  - Retry DB connection up to 10 times with 2s delay before throwing
- [x] Add `onModuleDestroy` in `PgVectorAdapter` to close the pool
- [x] Add `SIGTERM` handler in `main.ts` for clean container stop
- [x] Enable NestJS `enableShutdownHooks()` for graceful drain

---

## Completion Checklist

- [ ] `docker compose up -d` — all services reach healthy state
- [ ] `docker compose --profile seed run seed` — populates pgvector without errors
- [ ] `curl localhost:3001/api/health` — returns `{ status: 'ok' }`
- [ ] WebSocket connection to `ws://localhost:3001/chat` — chat works end-to-end
- [ ] `docker compose down -v && docker compose up -d` — clean restart works
- [ ] No secrets committed to git (`.env` in `.gitignore`)
