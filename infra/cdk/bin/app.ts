#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../lib/database-stack";
import { ApiStack } from "../lib/api-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

// ─── Stacks (dependency order) ─────────────────────────────────────────────

const dbStack = new DatabaseStack(app, "Database", {
  env,
  description: "experience-rag-bot — RDS PostgreSQL + pgvector",
});

const apiStack = new ApiStack(app, "Api", {
  env,
  description: "experience-rag-bot — ECS Fargate + ALB",
  dbStack,
  imageTag: app.node.tryGetContext("imageTag") ?? "latest",
});
apiStack.addDependency(dbStack);

const frontendStack = new FrontendStack(app, "Frontend", {
  env,
  description: "experience-rag-bot — S3 + CloudFront",
});

// ─── Tags ───────────────────────────────────────────────────────────────────

const stacks = [dbStack, apiStack, frontendStack];
for (const stack of stacks) {
  cdk.Tags.of(stack).add("Project", "experience-rag-bot");
  cdk.Tags.of(stack).add("Environment", "prod");
}
