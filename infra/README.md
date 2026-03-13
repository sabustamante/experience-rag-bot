# Infrastructure — AWS Deployment

This directory contains all AWS infrastructure for `experience-rag-bot`.

## Architecture

```
Internet
  │
  ▼
CloudFront ─── S3 (Next.js static export)
  │
  ▼
ALB (port 80/443)
  │
  ▼
ECS Fargate (NestJS API — port 3001)
  │
  ▼
RDS PostgreSQL 16 + pgvector
```

## Prerequisites

| Tool    | Version | Install               |
| ------- | ------- | --------------------- |
| AWS CLI | v2      | `brew install awscli` |
| AWS CDK | v2      | `npm i -g aws-cdk`    |
| Docker  | any     | docker.com            |
| Node.js | 22      | via nvm               |
| pnpm    | 10      | `npm i -g pnpm`       |

## First Deploy Walkthrough

### 1. Configure AWS credentials locally

```bash
aws configure
# AWS Access Key ID: <your ci-deploy key>
# AWS Secret Access Key: <secret>
# Default region: us-east-1
# Default output format: json
```

### 2. Bootstrap CDK (one-time per AWS account/region)

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
```

### 3. Create ECR repository

```bash
aws ecr create-repository \
  --repository-name experience-rag-bot/api \
  --region us-east-1
```

### 4. Populate SSM parameters

Run this once before deploying (replace values as needed):

```bash
AWS_REGION=us-east-1

put() { aws ssm put-parameter --name "$1" --value "$2" --type "${3:-String}" --overwrite; }

put /experience-rag-bot/prod/API_PORT            "3001"
put /experience-rag-bot/prod/AI_LLM_PROVIDER     "bedrock"
put /experience-rag-bot/prod/AI_EMBEDDING_PROVIDER "bedrock"
put /experience-rag-bot/prod/BEDROCK_MODEL_ID    "anthropic.claude-3-5-haiku-20241022-v1:0"
put /experience-rag-bot/prod/BEDROCK_EMBEDDING_MODEL_ID "amazon.titan-embed-text-v2:0"
put /experience-rag-bot/prod/EXPERIENCE_SOURCE   "markdown"
put /experience-rag-bot/prod/CACHE_PROVIDER      "memory"
put /experience-rag-bot/prod/CORS_ORIGINS        "https://yourdomain.com"
put /experience-rag-bot/prod/RATE_LIMIT_TTL      "60000"
put /experience-rag-bot/prod/RATE_LIMIT_MAX      "20"
```

### 5. Push first Docker image to ECR

```bash
# From repo root
export AWS_REGION=us-east-1
export ECR_REGISTRY=YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
export IMAGE_TAG=initial

bash infra/scripts/push-ecr.sh
```

### 6. Deploy all CDK stacks

```bash
cd infra/cdk
pnpm install
pnpm deploy
```

Stack deployment order (enforced by CDK dependency graph):

1. `Database` — VPC + RDS (takes ~10 min first time)
2. `Api` — ECS Fargate + ALB
3. `Frontend` — S3 + CloudFront

### 7. Note stack outputs

After deploy, CDK prints outputs. Save these values — you'll need them:

```
Database.DbEndpoint     = xxx.rds.amazonaws.com
Api.AlbDnsName          = xxx.us-east-1.elb.amazonaws.com
Frontend.BucketName     = experience-rag-bot-web-xxx-us-east-1
Frontend.DistributionId = EXXXXXXXXXXXXX
Frontend.DistributionUrl = https://xxx.cloudfront.net
```

### 8. Add GitHub Actions secrets

Go to **GitHub → Settings → Secrets → Actions** and add:

| Secret                  | Value                                             |
| ----------------------- | ------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | ci-deploy IAM key                                 |
| `AWS_SECRET_ACCESS_KEY` | ci-deploy IAM secret                              |
| `AWS_REGION`            | `us-east-1`                                       |
| `ECR_REGISTRY`          | `YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com`    |
| `NEXT_PUBLIC_API_URL`   | `http://Api.AlbDnsName` (or custom domain)        |
| `S3_BUCKET`             | `Frontend.BucketName`                             |
| `CF_DISTRIBUTION_ID`    | `Frontend.DistributionId`                         |
| `PRIVATE_SUBNET_IDS`    | comma-separated private subnet IDs (for seed job) |
| `ECS_SECURITY_GROUP_ID` | ECS task security group ID (for seed job)         |

### 9. Verify

```bash
# API health check
curl http://YOUR_ALB_DNS/api/health
# → { "status": "ok" }

# Frontend
open https://YOUR_CF_URL
```

### 10. Enable Bedrock model access (AWS Console)

Go to **AWS Console → Bedrock → Model access** and enable:

- `Claude 3.5 Haiku` (anthropic.claude-3-5-haiku-20241022-v1:0)
- `Titan Text Embeddings V2` (amazon.titan-embed-text-v2:0)

---

## How to update an env var without redeploying

SSM parameters are resolved at ECS task startup. To change a value:

```bash
aws ssm put-parameter \
  --name "/experience-rag-bot/prod/RATE_LIMIT_MAX" \
  --value "50" \
  --type String \
  --overwrite

# Force a new ECS deployment to pick up the new value
aws ecs update-service \
  --cluster experience-rag-bot \
  --service Api-Service \
  --force-new-deployment
```

---

## How to rollback

Rollback redeploys a previous image tag (git sha):

```bash
# From repo root
export AWS_REGION=us-east-1
export ECR_REGISTRY=YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
export IMAGE_TAG=abc1234  # previous git sha

# Update ECS to use the old tag
TASK_DEF=$(aws ecs describe-task-definition --task-definition Api-TaskDef --query taskDefinition --output json)
NEW_DEF=$(echo "$TASK_DEF" | jq \
  --arg IMG "$ECR_REGISTRY/experience-rag-bot/api:$IMAGE_TAG" \
  '.containerDefinitions[0].image = $IMG | del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.placementConstraints,.compatibilities,.registeredAt,.registeredBy)')

NEW_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_DEF" --query taskDefinition.taskDefinitionArn --output text)
aws ecs update-service --cluster experience-rag-bot --service Api-Service --task-definition "$NEW_ARN"
```

---

## Cost breakdown (~$28–31/mo)

| Service                  | Config                 | Cost           |
| ------------------------ | ---------------------- | -------------- |
| RDS PostgreSQL           | db.t4g.micro, 20GB gp3 | ~$15/mo        |
| ECS Fargate              | 0.25 vCPU, 0.5GB, Spot | ~$8/mo         |
| Bedrock Claude 3.5 Haiku | ~1,000 queries/mo      | ~$2–5/mo       |
| Bedrock Titan Embeddings | Seed + queries         | ~$1/mo         |
| S3 + CloudFront          | Static hosting         | ~$1/mo         |
| ECR                      | 1 image                | ~$0.50/mo      |
| **Total**                |                        | **~$28–31/mo** |
