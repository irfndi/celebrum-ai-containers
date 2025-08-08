# Technology Stack

## Core Technologies

- **Runtime**: Cloudflare Workers with Node.js compatibility
- **Language**: TypeScript (ES2022, ESNext modules)
- **Framework**: Hono for HTTP routing and middleware
- **Package Manager**: pnpm (required, no npm/yarn)
- **Build System**: TypeScript compiler + custom build scripts

## Infrastructure

- **Platform**: Cloudflare Workers + Containers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Storage**: Cloudflare KV, R2, Durable Objects
- **Deployment**: Alchemy deployment system
- **Configuration**: wrangler.jsonc for Cloudflare settings

## Key Libraries

- **Web Framework**: Hono v4.8.4
- **Database ORM**: Drizzle ORM v0.44.2
- **Telegram Bot**: Grammy v1.37.0
- **Trading APIs**: CCXT v4.4.92
- **Validation**: Zod v3.25.76
- **AI Integration**: Alchemy v0.43.5
- **Web Frontend**: Astro v5.11.0 with Tailwind CSS v4.1.11

## Development Tools

- **Linting**: oxlint v1.6.0 (fast Rust-based linter)
- **Testing**: Vitest v3.2.4 with Cloudflare Workers pool
- **Type Checking**: TypeScript v5.8.3
- **Local Development**: Miniflare v4 for Workers simulation
- **Deployment**: Wrangler v4.24.0

## Common Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm run dev          # Start development server (localhost:8787)
pnpm run dev:worker   # Start worker-only development
pnpm run dev:web      # Start Astro web development
```

### Building
```bash
pnpm run build        # Build all packages
pnpm run build:web    # Build Astro web frontend
pnpm run typecheck    # TypeScript type checking
```

### Testing
```bash
pnpm run test         # Run all tests
pnpm run test:unit    # Unit tests only
pnpm run test:integration  # Integration tests
pnpm run test:e2e     # End-to-end tests
pnpm run test:coverage     # Coverage report
```

### Quality & Deployment
```bash
pnpm run lint         # Run oxlint
pnpm run lint:fix     # Auto-fix linting issues
pnpm run deploy       # Deploy to production via Alchemy
make ci               # Full CI pipeline (recommended)
```

## Architecture Patterns

- **Modular Monorepo**: Single package with internal module structure
- **Service-Oriented**: Clear separation between services (db, shared, telegram-bot, etc.)
- **Path Aliases**: TypeScript path mapping for clean imports (@celebrum-ai/*)
- **Environment-Based**: Different configs for test/staging/production
- **Workers-First**: Designed for Cloudflare Workers runtime constraints