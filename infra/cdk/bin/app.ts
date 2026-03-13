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

const appName = app.node.tryGetContext("appName") ?? "experience-rag-bot";
const domainName = process.env.DOMAIN_NAME;
const certificateArn = process.env.CERTIFICATE_ARN;
const imageTag = app.node.tryGetContext("imageTag") ?? "latest";

// ─── Stacks (dependency order) ─────────────────────────────────────────────

const dbStack = new DatabaseStack(app, "Database", {
  env,
  appName,
  description: `${appName} — RDS PostgreSQL + pgvector`,
});

const apiStack = new ApiStack(app, "Api", {
  env,
  appName,
  domainName,
  certificateArn,
  description: `${appName} — ECS Fargate + ALB`,
  dbStack,
  imageTag,
});
apiStack.addDependency(dbStack);

const frontendStack = new FrontendStack(app, "Frontend", {
  env,
  appName,
  domainName,
  certificateArn,
  description: `${appName} — S3 + CloudFront`,
});

// ─── Tags ───────────────────────────────────────────────────────────────────

const stacks = [dbStack, apiStack, frontendStack];
for (const stack of stacks) {
  cdk.Tags.of(stack).add("Project", appName);
  cdk.Tags.of(stack).add("Environment", "prod");
}
