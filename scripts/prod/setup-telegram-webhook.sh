#!/usr/bin/env bash

# Setup script for Telegram Bot Webhook
set -euo pipefail

# Show usage if help requested
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [WORKER_URL]"
    echo ""
    echo "Setup Telegram Bot Webhook for Celebrum AI"
    echo ""
    echo "Arguments:"
    echo "  WORKER_URL    Worker URL (default: https://celebrum-ai.irfandimarsya.workers.dev)"
    echo "                Can also be set via WORKER_URL environment variable"
    echo ""
    echo "Examples:"
    echo "  $0                                              # Use default URL"
    echo "  $0 https://my-worker.example.workers.dev       # Use custom URL"
    echo "  WORKER_URL=https://staging.workers.dev $0      # Use environment variable"
    exit 0
fi

echo "🤖 Setting up Telegram Bot Webhook for Celebrum AI..."

# Check if required tools are available
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is required to set up webhook" >&2
    exit 1
fi

# Load environment variables from .env file
if [ -f .env ]; then
    echo "🔑 Loading environment variables from .env file..."
    set -a
    source .env
    set +a
else
    echo "⚠️ Warning: .env file not found, relying on existing environment variables"
fi

# Check if bot token exists
echo "🔑 Verifying bot token..."
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables" >&2
    echo "💡 Please set it in your .env file or as an environment variable" >&2
    exit 1
fi

# Worker URL - accept as environment variable or script argument with default
WORKER_URL="${1:-${WORKER_URL:-https://celebrum-ai.irfandimarsya.workers.dev}}"
WEBHOOK_URL="$WORKER_URL/api/telegram/webhook"

echo "📡 Setting webhook URL: $WEBHOOK_URL"

# Set webhook
if ! RESPONSE=$(curl -s --max-time 30 --connect-timeout 10 -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$WEBHOOK_URL\"}"); then
    echo "❌ Failed to connect to Telegram API (timeout or network error)" >&2
    exit 1
fi

# Check response
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook set successfully!"
    echo "📋 Response: $RESPONSE"
else
    echo "❌ Failed to set webhook"
    echo "📋 Response: $RESPONSE"
    exit 1
fi

# Get webhook info to verify
echo "🔍 Verifying webhook setup..."
if ! WEBHOOK_INFO=$(curl -s --max-time 30 --connect-timeout 10 "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"); then
    echo "⚠️ Warning: Failed to verify webhook setup (timeout or network error)" >&2
    echo "✅ Webhook was set, but verification failed"
else
    echo "📋 Webhook Info: $WEBHOOK_INFO"
fi

echo "✅ Telegram webhook setup completed!"
echo "💡 Test the bot by sending /start to @your_bot_username"