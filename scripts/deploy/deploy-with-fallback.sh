#!/bin/bash

# Deploy script with Docker fallback
# This script attempts to deploy with containers, but falls back to Durable Objects only if Docker is unavailable

set -e

echo "🚀 Starting Celebrum AI deployment..."

# Deploy using Alchemy (handles all resource management)
echo "✅ Deploying with Alchemy - manages all resources automatically"

# Deploy with Alchemy
pnpm run deploy:alchemy

echo "✅ Deployment successful with Alchemy!"
echo "ℹ️  Note: Alchemy manages all Cloudflare resources including existing ones."

echo "🎉 Deployment completed!"