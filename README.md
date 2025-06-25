# Celebrum AI

Arbitrage + Technical Analysis + AI platform for crypto trading opportunities.

## Overview

Celebrum AI is a comprehensive trading platform that combines:
- **Arbitrage Detection**: Real-time price difference analysis across exchanges
- **Technical Analysis**: Advanced charting and indicator analysis
- **AI-Powered Signals**: Machine learning models for trading opportunities
- **Multi-Interface Access**: Web dashboard, Telegram bot, and API
- **Automated Trading**: Manual and automated execution capabilities

## Architecture

The platform consists of multiple components:

```
celebrum-ai/
├── src/                 # Cloudflare Worker (API Gateway)
├── container_src/       # Go container (Trading Engine)
├── database/           # Database & Infrastructure (TS)
├── telegram-bot/       # Telegram Bot Interface (TS)
├── website/           # Web Dashboard (Next.js)
└── Makefile          # Development commands
```

## Tech Stack

- **API Gateway**: Cloudflare Workers (TypeScript)
- **Trading Engine**: Go containers for high-performance execution
- **Database**: PostgreSQL with Drizzle ORM, Redis for caching
- **Web Interface**: Next.js 14 with React 18
- **Bot Interface**: Telegram bot with Telegraf
- **Package Management**: pnpm workspaces

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Go 1.24+
- Docker (for containers)
- PostgreSQL
- Redis

### Installation

```bash
# Install all dependencies
make install

# Or install individually
pnpm install
cd database && pnpm install
cd telegram-bot && pnpm install
cd website && pnpm install
```

### Development

```bash
# Start main API gateway
make dev

# Start individual components
cd database && pnpm run dev
cd telegram-bot && pnpm run dev
cd website && pnpm run dev
```

### Available Commands

```bash
make help          # Show all available commands
make install       # Install dependencies
make dev          # Start development server
make typecheck    # Run TypeScript checking
make lint         # Run linting
make format       # Format code
make deploy       # Deploy to Cloudflare
```

## Learn More

To learn more about Containers, take a look at the following resources:

- [Container Documentation](https://developers.cloudflare.com/containers/) - learn about Containers
- [Container Class](https://github.com/cloudflare/containers) - learn about the Container helper class

Your feedback and contributions are welcome!
