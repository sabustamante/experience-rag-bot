# Roadmap

Development plan split into independent stages. Each stage has a concrete deliverable and can be paused without leaving anything broken.

See `CLOUDE.md` → **Git Workflow** section for the branching strategy per stage.

---

## Stages

| Stage | File | Deliverable | Depends on |
|-------|------|-------------|------------|
| **0 — Monorepo** | [stage-0-monorepo.md](stage-0-monorepo.md) | `pnpm turbo typecheck` passes green | nothing |
| **1 — Backend** | [stage-1-backend.md](stage-1-backend.md) | RAG chat works end-to-end via curl/Postman | Stage 0 |
| **2 — Docker Local** | [stage-2-docker-local.md](stage-2-docker-local.md) | `docker compose up` runs the full stack locally | Stage 1 |
| **3 — Frontend** | [stage-3-frontend.md](stage-3-frontend.md) | Landing + chat UI working in the browser | Stage 1 |
| **4 — Mobile** | [stage-4-mobile.md](stage-4-mobile.md) | Chat running on iOS/Android simulators | Stage 1 |
| **5 — AWS** | [stage-5-aws.md](stage-5-aws.md) | `git push main` deploys to AWS automatically | Stage 2, Stage 3 |
| **6 — CV Generator** | [stage-6-cv-generator.md](stage-6-cv-generator.md) | Job posting → downloadable ATS-optimized PDF | Stage 1, Stage 3 |

> Stages 3 and 4 are independent of each other and can be worked in parallel.

---

## Step structure

Each stage file follows the same format:

- **Steps** with `- [ ]` checkboxes to track progress
- **Commit block** per step with branch name (`feature/` or `fix/`) and description
- **Completion checklist** at the bottom to validate the stage deliverable

---

## Progress

- [ ] Stage 0 — Monorepo Base
- [ ] Stage 1 — Backend Core
- [ ] Stage 2 — Docker Local
- [ ] Stage 3 — Frontend Web
- [ ] Stage 4 — Mobile
- [ ] Stage 5 — AWS Deployment
- [ ] Stage 6 — CV Generator
