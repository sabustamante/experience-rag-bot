#!/usr/bin/env bash
# deploy-frontend.sh — Build Next.js static export and deploy to S3 + CloudFront.
#
# Usage:
#   S3_BUCKET=experience-rag-bot-web-123-us-east-1 \
#   CF_DISTRIBUTION_ID=EXXXXXXXXXXXXX \
#   NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
#     bash infra/scripts/deploy-frontend.sh
#
# Required environment variables:
#   S3_BUCKET            — target S3 bucket name
#   CF_DISTRIBUTION_ID   — CloudFront distribution ID for cache invalidation
#   NEXT_PUBLIC_API_URL  — public URL of the API (ALB DNS or custom domain)

set -euo pipefail

: "${S3_BUCKET:?S3_BUCKET is required}"
: "${CF_DISTRIBUTION_ID:?CF_DISTRIBUTION_ID is required}"
: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}"

echo "==> Building Next.js static export..."
export NEXT_PUBLIC_API_URL
pnpm --filter @repo/web build

echo "==> Syncing to S3 bucket: ${S3_BUCKET}..."
aws s3 sync apps/web/out/ "s3://${S3_BUCKET}" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html" \
  --exclude "*.json"

# HTML and JSON files should not be cached aggressively (they can change)
aws s3 sync apps/web/out/ "s3://${S3_BUCKET}" \
  --delete \
  --cache-control "public,max-age=0,must-revalidate" \
  --include "*.html" \
  --include "*.json"

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "/*"

echo "==> Frontend deployed successfully."
echo "    URL: https://$(aws cloudfront get-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text)"
