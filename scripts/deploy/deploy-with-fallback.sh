#!/bin/bash

# Deploy script with Docker fallback
# This script attempts to deploy with containers, but falls back to Durable Objects only if Docker is unavailable

set -e

echo "🚀 Starting Celebrum AI deployment..."

# Check if Docker is available
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "✅ Docker is available - deploying with containers"
    
    # Deploy with full container support
    pnpm dlx wrangler deploy
    
    echo "✅ Deployment successful with containers!"
else
    echo "⚠️  Docker not available - deploying without containers"
    
    # Create temporary wrangler config without containers
    cp wrangler.jsonc wrangler.jsonc.backup
    
    # Remove containers section from config
    sed '/"containers":/,/],/d' wrangler.jsonc > wrangler.temp.jsonc
    mv wrangler.temp.jsonc wrangler.jsonc
    
    # Deploy without containers
    pnpm dlx wrangler deploy
    
    # Restore original config
    mv wrangler.jsonc.backup wrangler.jsonc
    
    echo "✅ Deployment successful without containers!"
    echo "ℹ️  Note: Container functionality is disabled. Install Docker to enable full features."
fi

echo "🎉 Deployment completed!"