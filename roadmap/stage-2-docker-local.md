# Stage 2 — Local Infrastructure (Docker)

> **Goal:** The entire stack runs with a single `docker compose up` command. No manual setup required beyond copying `.env.example`.
>
> **Deliverable:** `docker compose up` brings up PostgreSQL + pgvector + NestJS API. The seed script can be run as a one-off container. The chat endpoint responds correctly.
>
> **Depends on:** Stage 1 complete (API builds successfully)

---

## Steps

### 2.1 — PostgreSQL + pgvector Docker Compose (DB only)

- [ ] Create `infra/docker-compose.yml`
- [ ] Add `postgres` service:
  - Image: `pgvector/pgvector:pg16`
  - Environment: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from `.env`
  - Ports: `5432:5432`
  - Volume: `postgres_data:/var/lib/postgresql/data` (named volume for persistence)
  - Health check: `pg_isready -U $POSTGRES_USER`
- [ ] Add `adminer` service (optional dev UI):
  - Image: `adminer`
  - Ports: `8080:8080`
  - Profile: `tools` (only starts with `--profile tools`)
- [ ] Create `infra/postgres/init.sql`:
  - `CREATE EXTENSION IF NOT EXISTS vector;`
  - Create `experience_chunks` table with `vector(1024)` column
  - Create ivfflat index
- [ ] Mount `init.sql` as `/docker-entrypoint-initdb.d/init.sql`
- [ ] Verify `docker compose up postgres` starts and `psql` connects

```
Commit: feature/docker-postgres
Description: Add docker-compose service for PostgreSQL 16 with pgvector extension
pre-installed. Includes init.sql that creates the experience_chunks table and
ivfflat index on first startup. Named volume ensures data persists across restarts.
```

---

### 2.2 — Dockerfile for `apps/api` (multi-stage)

- [ ] Create `apps/api/Dockerfile`:
  - **Stage 1 `base`**: `node:20-alpine`, install pnpm, set workdir
  - **Stage 2 `deps`**: copy `pnpm-lock.yaml` + all `package.json` files, run `pnpm install --frozen-lockfile`
  - **Stage 3 `build`**: copy source, run `pnpm turbo build --filter=api`
  - **Stage 4 `runner`**: copy only `dist/` and `node_modules/` from previous stages, expose port, set `CMD`
- [ ] Add `.dockerignore` at repo root:
  - `node_modules`, `.git`, `dist`, `*.local`, `.env*`
  - But allow `packages/*/src` and `apps/*/src`
- [ ] Build locally and verify image starts: `docker build -f apps/api/Dockerfile -t api-local .`
- [ ] Verify image size is reasonable (< 500MB)

```
Commit: feature/api-dockerfile
Description: Add multi-stage Dockerfile for the NestJS API. Uses pnpm workspaces
aware install (copies all package.json files before source) to maximize layer
caching. Final image contains only the compiled output and production dependencies.
```

---

### 2.3 — Full Docker Compose (API + DB)

- [ ] Add `api` service to `infra/docker-compose.yml`:
  - Build context: repo root, Dockerfile: `apps/api/Dockerfile`
  - Environment: read from `.env` file (use `env_file`)
  - Ports: `3000:3000` (REST) and `3002:3002` (WebSocket)
  - `depends_on` with condition `service_healthy` for `postgres`
  - Restart policy: `unless-stopped`
- [ ] Add `seed` service:
  - Same image as `api`
  - Command override: `node dist/scripts/seed.js`
  - `depends_on: api` with condition `service_healthy`
  - `restart: no` (run once)
  - Profile: `seed` (only runs with `--profile seed`)
- [ ] Add health check for `api` service: `GET /api/health`
- [ ] Add health endpoint `GET /api/health` in NestJS:
  - Returns `{ status: 'ok', timestamp: ... }`
- [ ] Verify full stack: `docker compose up -d` → all services healthy

```
Commit: feature/docker-compose-full
Description: Extend docker-compose with the NestJS API service. API waits for
postgres health check before starting. Includes a seed service (profile: seed)
for initial data loading and a /api/health endpoint used by Docker health checks.
```

---

### 2.4 — Environment Setup Documentation

- [ ] Create root `.env.example` with all required variables (values as `=` or `=your-value-here`)
- [ ] Add comments in `.env.example` grouping variables by section:
  - Database, AWS, AI Provider, Cache, App, Rate Limiting
- [ ] Ensure `.env` and `.env.local` are in `.gitignore`
- [ ] Create `infra/docker-compose.override.yml` for local dev overrides:
  - Mount `apps/api/src` as volume for hot reload (development only)
  - Override CMD to `pnpm dev` with `ts-node`
- [ ] Update root `README.md` with quickstart section:
  ```
  cp .env.example .env
  # fill in values
  docker compose up -d
  docker compose --profile seed run seed
  ```

```
Commit: feature/local-dev-setup
Description: Add .env.example with all required environment variables documented
by section. Add docker-compose.override.yml for development hot-reload. Update
README with one-command quickstart instructions.
```

---

### 2.5 — Health Checks + Startup Reliability

- [ ] Add `wait-for-it` or native retry logic in API startup:
  - Retry DB connection up to 10 times with 2s delay before throwing
- [ ] Add `onModuleInit` in `PgVectorAdapter` to test connectivity
- [ ] Add `onModuleInit` in `BedrockClaudeAdapter` to validate AWS credentials (dry call or list models)
- [ ] Handle graceful shutdown: `onApplicationShutdown` — close DB pool, flush cache
- [ ] Add `SIGTERM` handler in `main.ts` for clean container stop
- [ ] Test: `docker compose stop api` → API drains in-flight requests before stopping

```
Commit: feature/api-startup-reliability
Description: Add connection retry logic for PostgreSQL on API startup. Adapters
validate their external dependencies on module init. Graceful shutdown handler
drains in-flight requests on SIGTERM, ensuring zero data loss during container
restarts.
```

---

## Completion Checklist

- [ ] `docker compose up -d` — all services reach healthy state
- [ ] `docker compose --profile seed run seed` — populates pgvector without errors
- [ ] `curl localhost:3000/api/health` — returns `{ status: 'ok' }`
- [ ] WebSocket connection to `ws://localhost:3002` — chat works end-to-end
- [ ] `docker compose down -v && docker compose up -d` — clean restart works
- [ ] No secrets committed to git (`.env` in `.gitignore`)
- [ ] Image builds in < 3 minutes on a fresh Docker layer cache
