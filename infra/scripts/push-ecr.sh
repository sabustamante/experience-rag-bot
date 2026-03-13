#!/usr/bin/env bash
# push-ecr.sh — Build the API Docker image and push it to ECR.
#
# Usage:
#   AWS_REGION=us-east-1 ECR_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com \
#     IMAGE_TAG=abc1234 bash infra/scripts/push-ecr.sh
#
# Required environment variables:
#   AWS_REGION    — e.g. us-east-1
#   ECR_REGISTRY  — e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com
#   IMAGE_TAG     — git sha or "latest"

set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

REPO="experience-rag-bot/api"
FULL_IMAGE="${ECR_REGISTRY}/${REPO}"

echo "==> Authenticating Docker with ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "==> Building image: ${FULL_IMAGE}:${IMAGE_TAG}"
# Build from repo root so the Dockerfile COPY context works correctly
docker build \
  --platform linux/amd64 \
  -f apps/api/Dockerfile \
  -t "${FULL_IMAGE}:${IMAGE_TAG}" \
  -t "${FULL_IMAGE}:latest" \
  .

echo "==> Pushing ${FULL_IMAGE}:${IMAGE_TAG}..."
docker push "${FULL_IMAGE}:${IMAGE_TAG}"

echo "==> Pushing ${FULL_IMAGE}:latest..."
docker push "${FULL_IMAGE}:latest"

echo "==> Done. Image: ${FULL_IMAGE}:${IMAGE_TAG}"
