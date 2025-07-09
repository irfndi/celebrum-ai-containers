#!/bin/bash

# Deploy script using only wrangler (no Alchemy)
# This script is a fallback when Alchemy has issues with Durable Object migrations

set -e

echo "🚀 Starting Celebrum AI deployment with wrangler only..."

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler CLI not found. Please install it first:"
    echo "   pnpm add -g wrangler"
    exit 1
fi

# Check if user is logged in to wrangler
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to wrangler. Please run:"
    echo "   wrangler auth login"
    exit 1
fi

echo "✅ Wrangler CLI ready"

# Build the project first
echo "🔨 Building project..."
pnpm run build
echo "✅ Build completed"

# Deploy with wrangler (this will apply migrations automatically)
echo "🚀 Deploying with wrangler..."
wrangler deploy

echo "✅ Deployment completed successfully!"
echo "🌐 Your worker should be available at: https://celebrum-ai-containers.irfandimarsya.workers.dev"