# Build and Development Guide

**⚠️ OUTDATED DOCUMENTATION - This document is from the old monorepo structure and is kept for reference only.**

**For current build and development instructions, see the main README.md and use the Makefile commands.**

---

This guide covers the build system, development workflow, and deployment process for the ArbEdge monorepo.

## 📁 Monorepo Structure

```
ArbEdge/
├── packages/
│   ├── db/              # Database package (Drizzle ORM)
│   ├── shared/          # Shared types, utilities, and configurations
│   ├── telegram-bot/    # Telegram bot service
│   ├── web/             # Astro web application
│   └── worker/          # Cloudflare Worker (main service)
├── scripts/
│   ├── dev/             # Development scripts
│   └── deploy/          # Deployment scripts
└── docs/                # Documentation
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **pnpm** (v8+)
- **Rust** (latest stable)
- **Cloudflare CLI** (`wrangler`)

### Installation

```bash
# Install dependencies
pnpm install

# Install Rust target for WASM
rustup target add wasm32-unknown-unknown

# Login to Cloudflare (for deployment)
wrangler login
```

## 🔨 Build System

### Package-Specific Build Scripts

Each package has its own `build.sh` script:

- **`packages/db/build.sh`** - TypeScript compilation + schema generation
- **`packages/shared/build.sh`** - Multi-format builds with tsup
- **`packages/telegram-bot/build.sh`** - TypeScript + optional Rust components
- **`packages/web/build.sh`** - Astro build process
- **`packages/worker/build.sh`** - TypeScript + WASM compilation

### Build Commands

```bash
# Build all packages
pnpm run build

# Build specific packages using Makefile
make build-db
make build-shared
make build-telegram-bot
make build-web
make build-worker

# Build individual packages directly
cd packages/worker && ./build.sh
```

### Makefile Commands

The root `Makefile` provides comprehensive build targets:

```bash
# Development
make dev                 # Start all development servers
make dev-worker          # Start worker dev server
make dev-web             # Start web dev server

# Building
make build               # Build all packages
make build-worker        # Build worker package

# Testing
make test                # Run all tests
make test-worker         # Test worker package

# Linting
make lint                # Lint all packages
make lint-worker         # Lint worker package

# Type checking
make typecheck           # Type check all packages
make typecheck-worker    # Type check worker package

# Cleaning
make clean               # Clean all packages
make clean-worker        # Clean worker package

# Deployment
make deploy              # Deploy all packages
make deploy-worker       # Deploy worker package
```

## 🛠️ Development Workflow

### Starting Development Servers

```bash
# Start all services (recommended)
pnpm run dev:all
# or
./scripts/dev/start-dev.sh all

# Start individual services
pnpm run dev:worker      # Cloudflare Worker
pnpm run dev:web         # Astro web app
pnpm run dev:telegram-bot # Telegram bot
pnpm run dev:db          # Database tools (Drizzle Studio)
```

### Development Script Features

The `scripts/dev/start-dev.sh` script provides:

- **Concurrent execution** - Runs multiple services simultaneously
- **Color-coded output** - Easy identification of different services
- **Individual service control** - Start only what you need
- **Automatic dependency checking** - Ensures prerequisites are met

### Package Development

#### Database (`packages/db`)

```bash
cd packages/db

# Generate migrations
pnpm run db:generate

# Run migrations
pnpm run db:migrate

# Open Drizzle Studio
pnpm run db:studio
```

#### Worker (`packages/worker`)

```bash
cd packages/worker

# Development with hot reload
pnpm run dev

# Build for production
pnpm run build

# Deploy to Cloudflare
pnpm run deploy
```

#### Web (`packages/web`)

```bash
cd packages/web

# Development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## 🚢 Deployment

### Deployment Script

The `scripts/deploy/deploy.sh` script handles deployment:

```bash
# Deploy all packages to development
./scripts/deploy/deploy.sh all

# Deploy specific package
./scripts/deploy/deploy.sh worker production

# Quick deployment commands
pnpm run deploy:prod     # Deploy all to production
pnpm run deploy:staging  # Deploy all to staging
pnpm run deploy:worker   # Deploy worker to development
```

### Deployment Environments

- **development** - Default environment for testing
- **staging** - Pre-production environment
- **production** - Live production environment

### Deployment Process

1. **Prerequisites check** - Verifies Wrangler CLI and authentication
2. **Build packages** - Compiles all necessary packages
3. **Run tests** - Ensures code quality before deployment
4. **Deploy** - Pushes to specified environment

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# Run tests with CI configuration
pnpm run test:ci

# Test specific packages
make test-worker
make test-web
```

## 🔍 Code Quality

### Linting

```bash
# Lint all packages
pnpm run lint

# Lint specific packages
make lint-worker
make lint-web
```

### Type Checking

```bash
# Type check all packages
pnpm run typecheck

# Type check specific packages
make typecheck-worker
make typecheck-web
```

### Formatting

```bash
# Format all packages
pnpm run format

# Format specific packages
make fmt
make fmt-fix
```

## 🔧 Configuration Files

### Root Configuration

- **`package.json`** - Monorepo scripts and workspace configuration
- **`pnpm-workspace.yaml`** - pnpm workspace definition
- **`Makefile`** - Build system commands
- **`wrangler.toml`** - Cloudflare Worker configuration

### Package Configuration

- **`packages/*/package.json`** - Package-specific dependencies and scripts
- **`packages/*/tsconfig.json`** - TypeScript configuration
- **`packages/*/build.sh`** - Custom build scripts

## 🐛 Troubleshooting

### Common Issues

1. **Build failures**
   ```bash
   # Clean and rebuild
   pnpm run clean
   pnpm install
   pnpm run build
   ```

2. **WASM compilation issues**
   ```bash
   # Ensure Rust target is installed
   rustup target add wasm32-unknown-unknown
   ```

3. **Development server issues**
   ```bash
   # Check if ports are available
   lsof -i :8787  # Worker default port
   lsof -i :4321  # Astro default port
   ```

### Debug Mode

Enable debug output for scripts:

```bash
# Enable debug mode
export DEBUG=1
./scripts/dev/start-dev.sh all
```

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Astro Documentation](https://docs.astro.build/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)

## 🤝 Contributing

When contributing to the build system:

1. **Test locally** - Ensure all build scripts work on your machine
2. **Update documentation** - Keep this guide current with changes
3. **Follow conventions** - Maintain consistency with existing patterns
4. **Test CI/CD** - Verify changes work in automated environments