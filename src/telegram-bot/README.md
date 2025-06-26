# Telegram Bot

Telegram bot interface for Celebrum AI trading platform.

## Features

- Real-time trading alerts and notifications
- Manual trading commands
- Portfolio monitoring
- Market analysis reports
- User authentication and settings

## Setup

```bash
# Install dependencies
pnpm install

# Start development
pnpm run dev

# Build for production
pnpm run build
pnpm run start
```

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
API_BASE_URL=http://localhost:8787
DATABASE_URL=postgresql://user:password@localhost:5432/celebrum_ai
```

## Bot Commands

- `/start` - Initialize bot
- `/portfolio` - View portfolio
- `/alerts` - Manage alerts
- `/trade` - Manual trading
- `/settings` - Bot settings