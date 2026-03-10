# Stage 5 — AWS Deployment

> **Goal:** Deploy the exact same Docker setup from Stage 2 to AWS. No code changes required — only infrastructure configuration. The architecture is designed to be cloud-agnostic so a future migration to GCP/Azure only requires replacing the CDK stack and swapping the Bedrock adapters.
>
> **Deliverable:** `git push main` triggers a full CI/CD pipeline that builds, tests, and deploys the API to ECS Fargate and the frontend to S3/CloudFront.
>
> **Depends on:** Stage 2 (Docker working locally), Stage 3 (web build working)
>
> **Estimated cost:** ~$28–31/mo (see CLAUDE.md for breakdown)

---

## Steps

### 5.1 — AWS Account Bootstrap + IAM

- [ ] Create dedicated AWS account or use existing (recommend a dedicated one for isolation)
- [ ] Create IAM user `ci-deploy` with programmatic access only:
  - Policies: `AmazonECS_FullAccess`, `AmazonEC2ContainerRegistryFullAccess`, `AmazonRDSFullAccess`, `AmazonS3FullAccess`, `CloudFrontFullAccess`, `AmazonSSMFullAccess`
- [ ] Store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub Actions secrets
- [ ] Enable Bedrock model access in AWS console:
  - `anthropic.claude-3-haiku-20240307-v1:0`
  - `amazon.titan-embed-text-v2:0`
- [ ] Create S3 bucket for CDK bootstrap: `cdk bootstrap aws://ACCOUNT/REGION`

```
Commit: feature/aws-iam-bootstrap
Description: Document AWS account setup, IAM user creation for CI/CD, and Bedrock
model access enablement. CDK bootstrap prepares the account for infrastructure
deployment. IAM follows least-privilege — ci-deploy only has permissions required
for the specific services used.
```

---

### 5.2 — ECR Repository + First Image Push

- [ ] Create ECR repository via AWS CLI or CDK: `experience-rag-bot/api`
- [ ] Add push script `infra/scripts/push-ecr.sh`:
  ```bash
  aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
  docker build -f apps/api/Dockerfile -t $ECR_REGISTRY/api:$IMAGE_TAG .
  docker push $ECR_REGISTRY/api:$IMAGE_TAG
  ```
- [ ] Tag strategy: `latest` + `git-sha` (e.g., `abc1234`)
- [ ] Verify first manual push succeeds: `bash infra/scripts/push-ecr.sh`
- [ ] Add `.aws/credentials` warning to `.gitignore` and README

```
Commit: feature/ecr-setup
Description: Create ECR repository for the API image and add push script. Images
are tagged with both 'latest' and the git commit SHA, enabling rollback to any
previous version by re-deploying a specific SHA tag.
```

---

### 5.3 — RDS PostgreSQL + pgvector

- [ ] Create RDS instance via CDK (`infra/cdk/lib/database-stack.ts`):
  - Engine: `PostgresEngineVersion.VER_16`
  - Instance class: `InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO)`
  - Storage: `20 GB gp3`
  - Multi-AZ: `false` (single AZ for cost savings)
  - Deletion protection: `true`
  - Backup retention: `7 days`
- [ ] Configure security group: allow inbound `5432` only from ECS task security group
- [ ] Store DB credentials in Secrets Manager (auto-rotated):
  - CDK: `rds.DatabaseInstance.secret` → automatically created
- [ ] Create init lambda or one-off ECS task to run `init.sql` (pgvector extension + table)
- [ ] Verify connectivity from a local machine via an SSH tunnel (bastion host optional)

```
Commit: feature/rds-database-stack
Description: Add CDK DatabaseStack provisioning RDS PostgreSQL 16 with t4g.micro
(~$15/mo). Credentials stored in Secrets Manager with auto-rotation. Security
group restricts DB access to ECS tasks only. Init script creates pgvector
extension and experience_chunks table on first deploy.
```

---

### 5.4 — ECS Fargate + ALB

- [ ] Create CDK stack `infra/cdk/lib/api-stack.ts`:
  - **VPC**: reuse default or create with 2 AZs, 1 public + 1 private subnet each
  - **ECS Cluster**: Fargate, container insights enabled
  - **Task Definition**:
    - CPU: `256` (0.25 vCPU), Memory: `512 MB`
    - Image: ECR image (parameterized by image tag)
    - Environment variables: read from SSM Parameter Store
    - Secrets: DB credentials from Secrets Manager
    - Port mappings: `3000` (REST), `3002` (WebSocket)
  - **Fargate Service**:
    - Desired count: `1`
    - Spot capacity provider (cost reduction ~70%)
    - Health check grace period: `60s`
  - **ALB**:
    - HTTP listener → redirect to HTTPS
    - HTTPS listener → forward to ECS target group
    - Health check path: `/api/health`
    - Stickiness: disabled (stateless API)
  - **ACM Certificate**: create or import for your domain
- [ ] Assign task role with permissions: `bedrock:InvokeModel`, `ssm:GetParameter`, `secretsmanager:GetSecretValue`

```
Commit: feature/ecs-api-stack
Description: Add CDK ApiStack deploying NestJS to ECS Fargate with Spot capacity
(~$8/mo). ALB handles HTTPS termination and health checks. Task role grants
least-privilege access to Bedrock, SSM, and Secrets Manager. Image tag is
parameterized for zero-downtime rolling deployments.
```

---

### 5.5 — SSM Parameter Store (Environment Variables)

- [ ] Create CDK construct or script to populate SSM parameters:
  - `/experience-rag-bot/prod/API_PORT`
  - `/experience-rag-bot/prod/AI_LLM_PROVIDER`
  - `/experience-rag-bot/prod/AI_EMBEDDING_PROVIDER`
  - `/experience-rag-bot/prod/BEDROCK_MODEL_ID`
  - `/experience-rag-bot/prod/BEDROCK_EMBEDDING_MODEL_ID`
  - `/experience-rag-bot/prod/EXPERIENCE_SOURCE`
  - `/experience-rag-bot/prod/CACHE_PROVIDER`
  - `/experience-rag-bot/prod/CORS_ORIGINS`
  - `/experience-rag-bot/prod/RATE_LIMIT_TTL`
  - `/experience-rag-bot/prod/RATE_LIMIT_MAX`
- [ ] Sensitive values (DB password, API keys) stored as `SecureString`
- [ ] Update ECS task definition to read params from SSM at container startup
- [ ] Document: `infra/README.md` — how to update a param without redeploying

```
Commit: feature/ssm-parameters
Description: Store all API environment variables in SSM Parameter Store under
/experience-rag-bot/prod/ namespace. Sensitive values use SecureString (KMS
encrypted). ECS task fetches parameters at startup — updating a config value
requires only a task restart, not a new image build.
```

---

### 5.6 — S3 + CloudFront (Frontend)

- [ ] Create CDK stack `infra/cdk/lib/frontend-stack.ts`:
  - **S3 bucket**: private, versioning enabled, block all public access
  - **CloudFront distribution**:
    - Origin: S3 bucket (OAC — Origin Access Control)
    - Cache policy: `CachingOptimized` for static assets, `CachingDisabled` for API paths
    - Default root object: `index.html`
    - Error page: `404.html` → `/index.html` (SPA fallback for Next.js ISR)
    - HTTPS only, TLS 1.2+
    - Custom domain via ACM
- [ ] Add deploy script `infra/scripts/deploy-frontend.sh`:
  - `next build` → `aws s3 sync out/ s3://bucket-name --delete`
  - `aws cloudfront create-invalidation --paths "/*"`
- [ ] Configure Next.js `output: 'export'` or use `next export` for static output
- [ ] Add `NEXT_PUBLIC_API_URL` pointing to ALB domain in production

```
Commit: feature/frontend-stack
Description: Add CDK FrontendStack deploying Next.js static export to S3 with
CloudFront CDN. OAC keeps the S3 bucket private. Deploy script syncs the build
output and invalidates the CloudFront cache. TTFB for static assets from CDN
is ~50ms globally.
```

---

### 5.7 — CDK App Entry + Stack Composition

- [ ] Initialize CDK app: `infra/cdk/bin/app.ts`
- [ ] Compose stacks with correct dependency order:
  ```typescript
  const dbStack = new DatabaseStack(app, 'Database', { env });
  const apiStack = new ApiStack(app, 'Api', { env, dbStack });
  const frontendStack = new FrontendStack(app, 'Frontend', { env });
  ```
- [ ] Add stack tags: `Project: experience-rag-bot`, `Environment: prod`
- [ ] Add `cdk diff` and `cdk deploy` scripts to `infra/package.json`
- [ ] Write `infra/README.md`:
  - Prerequisites (AWS CLI, CDK, credentials)
  - First deploy walkthrough
  - How to rollback (redeploy previous image tag)
  - Cost breakdown per service
- [ ] Run `cdk synth` and verify CloudFormation templates generate without errors

```
Commit: feature/cdk-app
Description: Compose all CDK stacks (Database, Api, Frontend) into a single app
with explicit dependency wiring. Stack tags enable cost allocation by project.
Includes infra README with first-deploy walkthrough and rollback instructions.
```

---

### 5.8 — CI/CD Pipeline (GitHub Actions)

- [ ] Create `.github/workflows/deploy.yml`
- [ ] Trigger: push to `main` branch only
- [ ] Jobs (run in sequence):
  1. **test** — `pnpm turbo test lint typecheck`
  2. **build-api** — Docker build + push to ECR with `git-sha` tag
  3. **deploy-api** — Update ECS service with new image tag (rolling update)
  4. **build-web** — `pnpm --filter web build`
  5. **deploy-web** — `aws s3 sync` + CloudFront invalidation
  6. **seed** (conditional) — Run seed ECS task only if `packages/experience-data/**` changed
- [ ] Add GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECR_REGISTRY`
- [ ] Add deployment notification (optional): Slack or GitHub commit status
- [ ] Test full pipeline: push a commit to `main` → verify all jobs pass

```
Commit: feature/cicd-pipeline
Description: Add GitHub Actions deployment pipeline triggered on pushes to main.
Pipeline runs tests first, then builds and deploys API (ECS rolling update) and
frontend (S3+CloudFront) in parallel. The seed job runs conditionally only when
experience data files change, avoiding unnecessary Bedrock API calls.
```

---

## Cloud Portability Notes

The architecture is deliberately cloud-agnostic at the application layer:

| Component | AWS (current) | GCP equivalent | Azure equivalent |
|-----------|--------------|----------------|-----------------|
| Container runtime | ECS Fargate | Cloud Run | Azure Container Apps |
| Database | RDS PostgreSQL | Cloud SQL | Azure Database for PostgreSQL |
| CDN + Static | S3 + CloudFront | Cloud Storage + Cloud CDN | Blob Storage + Azure CDN |
| Secrets | Secrets Manager | Secret Manager | Key Vault |
| LLM | Bedrock (Claude) | Vertex AI (Claude) | Azure OpenAI |
| IaC | CDK | CDK (supports CloudFormation, Terraform) | Bicep / Terraform |

To migrate: swap the CDK stack + swap `BedrockClaudeAdapter` → `VertexAIAdapter` (one line in `ai.module.ts`). Domain logic is untouched.

---

## Completion Checklist

- [ ] `cdk deploy --all` — all stacks deploy without errors
- [ ] `curl https://api.yourdomain.com/api/health` — returns `{ status: 'ok' }`
- [ ] `https://yourdomain.com` — landing page loads from CloudFront
- [ ] Chat works end-to-end in production (browser → ALB → ECS → Bedrock → pgvector)
- [ ] GitHub Actions pipeline deploys on every push to `main`
- [ ] No AWS credentials committed to git
- [ ] Monthly bill < $35
