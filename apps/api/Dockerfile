# syntax=docker/dockerfile:1

# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo

# ─── Stage 2: deps ────────────────────────────────────────────────────────────
FROM base AS deps
# Copy manifests only — cache this layer until lockfile changes
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/experience-data/package.json ./packages/experience-data/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ─── Stage 3: build ───────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @repo/shared-types build
RUN pnpm --filter @repo/experience-data build
RUN pnpm --filter @repo/api build

# ─── Stage 4: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo

# Copy workspace manifests (needed for pnpm workspace resolution at runtime)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/experience-data/package.json ./packages/experience-data/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Copy production node_modules and built artifacts
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /repo/packages/experience-data/dist ./packages/experience-data/dist
# Experience data markdown files (example data bundled in image)
COPY --from=build /repo/packages/experience-data/markdown ./packages/experience-data/markdown

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /repo/apps/api
EXPOSE 3001

CMD ["node", "dist/main"]
