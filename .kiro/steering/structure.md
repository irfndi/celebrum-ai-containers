# Project Structure

## Root Level Organization

```
celebrum-ai/
├── src/                    # Main source code
├── scripts/                # Build, deploy, and utility scripts
├── docs/                   # Documentation and PRDs
├── container_src/          # Go container source (optional)
├── coverage/               # Test coverage reports
├── test-results/           # Test output and reports
└── .temporary-code/        # Temporary development files
```

## Source Code Structure (`src/`)

### Core Modules
- **`src/index.ts`** - Main application entry point (Hono app + Cloudflare Workers)
- **`src/db/`** - Database layer with Drizzle ORM, migrations, repositories
- **`src/shared/`** - Shared utilities, types, middleware, validation
- **`src/services/`** - Business logic services (analysis, opportunities, trading)

### Application Modules  
- **`src/telegram-bot/`** - Telegram bot implementation with Grammy
- **`src/web/`** - Astro web frontend with SSR
- **`src/api/`** - REST API endpoints and handlers
- **`src/trading/`** - Trading logic and exchange integrations

### Testing Structure
Each module contains its own `tests/` directory with:
- **`tests/unit/`** - Unit tests for individual functions/classes
- **`tests/integration/`** - Integration tests with external services
- **`tests/e2e/`** - End-to-end workflow tests
- **`tests/fixtures/`** - Test data and mock objects

## Path Aliases

Use TypeScript path aliases for clean imports:
```typescript
import { UserService } from "@celebrum-ai/services";
import { DatabaseConnection } from "@celebrum-ai/db";
import { TelegramHandler } from "@celebrum-ai/telegram-bot";
import { validateRequest } from "@celebrum-ai/shared";
```

## Configuration Files

### Build & Development
- **`tsconfig.json`** - TypeScript configuration with path aliases
- **`vitest.config.ts`** - Test configuration for Cloudflare Workers
- **`wrangler.jsonc`** - Cloudflare Workers deployment config
- **`package.json`** - Dependencies and npm scripts

### Code Quality
- **`.oxlintrc.json`** - Linting rules configuration
- **`Makefile`** - Development workflow commands
- **`.gitignore`** - Git ignore patterns

## Naming Conventions

### Files & Directories
- **Services**: `user.service.ts`, `opportunity.service.ts`
- **Types**: `types.ts`, `interfaces.ts` 
- **Tests**: `*.test.ts`, `*.spec.ts`
- **Handlers**: `telegram.handler.ts`, `webhook.handler.ts`

### Code Structure
- **Classes**: PascalCase (`UserService`, `OpportunityDetector`)
- **Functions**: camelCase (`getUserProfile`, `detectArbitrage`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with `I` prefix (`IUserRepository`)

## Module Dependencies

### Dependency Flow
```
src/index.ts
├── src/telegram-bot/ (Grammy bot)
├── src/web/ (Astro frontend)  
├── src/services/ (Business logic)
│   └── src/shared/ (Utilities)
│       └── src/db/ (Data layer)
```

### Import Rules
- **No circular dependencies** between modules
- **Services** can import from `shared` and `db`
- **Shared** can import from `db` only
- **DB** has no internal dependencies
- **Applications** (telegram-bot, web) can import from services, shared, db

## Environment-Specific Structure

### Development
- Use `miniflare` for local Cloudflare Workers simulation
- Test files run with Vitest + Cloudflare Workers pool
- Hot reload enabled for rapid development

### Production  
- Deployed via Alchemy to Cloudflare Workers
- D1 database with production migrations
- KV/R2/Durable Objects for scalable storage

## File Organization Best Practices

- **One primary export per file** for clear module boundaries
- **Group related functionality** in directories (handlers/, services/, types/)
- **Separate concerns** between data access, business logic, and presentation
- **Keep test files** adjacent to source files they test
- **Use index.ts files** to create clean public APIs for modules