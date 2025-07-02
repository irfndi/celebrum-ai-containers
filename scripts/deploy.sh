#!/bin/bash
# Production Deployment Script for Celebrum AI
# Deploys to Cloudflare Workers with all required services

set -e

echo "🚀 Starting Celebrum AI Production Deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    pnpm add -g wrangler@latest
fi

# Authenticate with Cloudflare (if not already authenticated)
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please authenticate with Cloudflare:"
    wrangler login
fi

# Set required secrets
echo "🔑 Setting up secrets..."

# Disable command echoing to prevent secrets from being logged
set +x

# Telegram Bot Token - check environment variable first
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "TELEGRAM_BOT_TOKEN not found in environment variables."
    read -s -p "Enter TELEGRAM_BOT_TOKEN: " TELEGRAM_BOT_TOKEN
    echo
else
    echo "✅ Using TELEGRAM_BOT_TOKEN from environment variables"
fi
wrangler secret put TELEGRAM_BOT_TOKEN --env production <<< "$TELEGRAM_BOT_TOKEN"

# Cloudflare API Token - check environment variable first
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "CLOUDFLARE_API_TOKEN not found in environment variables."
    read -s -p "Enter CLOUDFLARE_API_TOKEN: " CLOUDFLARE_API_TOKEN
    echo
else
    echo "✅ Using CLOUDFLARE_API_TOKEN from environment variables"
fi
wrangler secret put CLOUDFLARE_API_TOKEN --env production <<< "$CLOUDFLARE_API_TOKEN"

# Re-enable command echoing if it was previously enabled
set -x

# Run CI pipeline before deployment
echo "🧪 Running CI pipeline to ensure code quality..."
pnpm run lint
pnpm run test
pnpm run build

# Deploy using Alchemy (manages all resources)
echo "🚀 Deploying with Alchemy..."
pnpm run deploy:alchemy

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your domain DNS to point to the Worker"
echo "2. Test all endpoints"
echo "3. Monitor logs: wrangler tail --env production"
echo "4. Check analytics in Cloudflare dashboard"
echo ""
echo "🔗 Useful commands:"
echo "  View logs: wrangler tail --env production"
echo "  Update secrets: wrangler secret put SECRET_NAME --env production"
echo "  Check KV data: wrangler kv:key list --binding USER_PROFILES --env production"
echo "  Query D1: wrangler d1 execute arbitrage-production --command 'SELECT * FROM users;' --env production"