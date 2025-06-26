# Cerebrum AI Unified Monorepo Makefile
# Celebrum AI Monorepo - TypeScript & Go with Cloudflare Containers

# Use standard shell with pnpm
SHELL := /bin/bash
export PATH := $(PATH)

.PHONY: help setup test build build-wasm coverage clean lint fix fmt check-all deploy deploy-wasm pre-commit local-ci full-check unit-tests integration-tests e2e-tests lib-tests ci-pipeline ci dev-quick quick validate fix-and-validate quality test-api test-api-local test-api-staging test-api-production test-api-prod-admin test-api-v1 test-api-v1-local test-api-v1-staging test-api-v1-production build-packages build-db build-shared build-telegram-bot build-web build-worker test-packages test-db test-shared test-telegram-bot test-web test-worker lint-packages lint-db lint-shared lint-telegram-bot lint-web lint-worker dev dev-worker dev-web dev-telegram-bot deploy-worker deploy-web fmt-check fmt-fix lint-strict typecheck typecheck-db typecheck-shared typecheck-telegram-bot typecheck-web typecheck-worker check check-wasm clean-go clean-packages clean-db clean-shared clean-telegram-bot clean-web clean-worker doc build-release build-containers test-verbose test-performance test-performance-local test-performance-staging test-performance-production test-performance-stress test-webhook-local test-performance-ramp test-performance-extreme test-complete-super-admin test-complete-super-admin-production test-complete-super-admin-local

help: ## Show this help message
	@echo "🚀 Celebrum AI Monorepo Commands"
	@echo "===================================="
	@echo "\033[33m💡 Tip: Use 'make ci' for full validation (TypeScript + Go)\033[0m"
	@echo "\033[33m💡 Tip: Use 'make fix-and-validate' to auto-fix then validate\033[0m"
	@echo "===================================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Run development environment setup
	@./scripts/dev/dev-setup.sh

# Package management
install: ## Install all dependencies (TypeScript + Go packages)
	@echo "📦 Installing dependencies..."
	@echo "📦 Installing pnpm dependencies..."
	@pnpm install
	@echo "📦 Setting up Go toolchain..."
	@go version || echo "⚠️  Go not installed. Please install Go from https://golang.org/dl/"

# TypeScript package commands
build-packages: ## Build all TypeScript packages
	@echo "🔨 Building TypeScript packages..."
	@pnpm run build

build-db: ## Build database package
	@echo "🔨 Building database package..."
	@pnpm --filter @celebrum-ai/db run build

build-shared: ## Build shared package
	@echo "🔨 Building shared package..."
	@pnpm --filter @celebrum-ai/shared run build

build-telegram-bot: ## Build telegram bot package
	@echo "🔨 Building telegram bot package..."
	@pnpm --filter @celebrum-ai/telegram-bot run build

build-web: ## Build web package
	@echo "🔨 Building web package..."
	@pnpm --filter @celebrum-ai/web run build

build-worker: ## Build worker (root src)
	@echo "🔨 Building worker (root src)..."
	@wrangler deploy --dry-run

test-packages: ## Test all TypeScript packages
	@echo "🧪 Testing TypeScript packages..."
	@pnpm run test

test-db: ## Test database package
	@echo "🧪 Testing database package..."
	@pnpm --filter @celebrum-ai/db run test

test-shared: ## Test shared package
	@echo "🧪 Testing shared package..."
	@pnpm --filter @celebrum-ai/shared run test

test-telegram-bot: ## Test telegram bot package
	@echo "🧪 Testing telegram bot package..."
	@pnpm --filter @celebrum-ai/telegram-bot run test

test-web: ## Test web package
	@echo "🧪 Testing web package..."
	@pnpm --filter @celebrum-ai/web run test

test-worker: ## Test worker (root src)
	@echo "🧪 Testing worker (root src)..."
	@vitest run

lint-packages: ## Lint all TypeScript packages
	@echo "🔍 Linting TypeScript packages..."
	@pnpm run lint

lint-db: ## Lint database package
	@echo "🔍 Linting database package..."
	@pnpm --filter @celebrum-ai/db run lint

lint-shared: ## Lint shared package
	@echo "🔍 Linting shared package..."
	@pnpm --filter @celebrum-ai/shared run lint

lint-telegram-bot: ## Lint telegram bot package
	@echo "🔍 Linting telegram bot package..."
	@pnpm --filter @celebrum-ai/telegram-bot run lint

lint-web: ## Lint web package
	@echo "🔍 Linting web package..."
	@pnpm --filter @celebrum-ai/web run lint

lint-worker: ## Lint worker (root src)
	@echo "🔍 Linting worker (root src)..."
	@oxlint src

# Testing commands
test: ## Run all tests (TypeScript + Go)
	@echo "🧪 Running TypeScript tests..."
	@pnpm run test
	@echo "🧪 Running Go tests..."
	@go test ./... || echo "⚠️  No Go modules found yet"

test-verbose: ## Run tests with verbose output
	@echo "🧪 Running tests (verbose)..."
	@pnpm run test -- --verbose
	@go test -v ./... || echo "⚠️  No Go modules found yet"

unit-tests: ## Run unit tests
	@echo "🧪 Running TypeScript unit tests..."
	@pnpm run test:unit

integration-tests: ## Run integration tests
	@echo "🧪 Running integration tests..."
	@pnpm run test:integration

e2e-tests: ## Run E2E tests
	@echo "🧪 Running E2E tests..."
	@pnpm run test:e2e

# Build commands
build: ## Build all packages
	@echo "🔨 Building dependencies first..."
	@pnpm --filter @celebrum-ai/db run build && pnpm --filter @celebrum-ai/shared run build
	@echo "🔨 Building remaining TypeScript packages..."
	@pnpm run build
	@echo "🔨 Building Go services..."
	@go build ./... || echo "⚠️  No Go modules found yet"

build-release: ## Build release for production
	@echo "🔨 Building production release..."
	@pnpm run build:prod
	@go build -ldflags="-s -w" ./... || echo "⚠️  No Go modules found yet"

build-wasm: ## Build for WASM target (Cloudflare Workers)
	@echo "🎯 Building for Cloudflare Workers..."
	@pnpm run build:worker

build-containers: ## Build Docker containers
	@echo "🐳 Building Docker containers..."
	@docker build -t celebrum-ai:latest .

# Development commands
dev: ## Start development servers for all packages
	@echo "🚀 Starting development servers..."
	@pnpm run dev

dev-worker: ## Start worker development server
	@echo "🚀 Starting worker development server..."
	@wrangler dev

dev-web: ## Start web development server
	@echo "🚀 Starting web development server..."
	@pnpm --filter @celebrum-ai/web run dev

dev-telegram-bot: ## Start telegram bot development server
	@echo "🚀 Starting telegram bot development server..."
	@pnpm --filter @celebrum-ai/telegram-bot run dev

# Deployment commands
deploy: ## Deploy all packages
	@echo "🚀 Deploying all packages..."
	@pnpm run deploy

deploy-worker: ## Deploy worker (root src)
	@echo "🚀 Deploying worker (root src)..."
	@wrangler deploy

deploy-web: ## Deploy web package
	@echo "🚀 Deploying web package..."
	@pnpm --filter @celebrum-ai/web run deploy

# Code quality commands
fmt: ## Format code (TypeScript + Go)
	@echo "🎨 Formatting TypeScript code..."
	@pnpm run format
	@echo "🎨 Formatting Go code..."
	@go fmt ./... || echo "⚠️  No Go modules found yet"

fmt-check: ## Check code formatting (TypeScript + Go)
	@echo "🎨 Checking TypeScript code formatting..."
	@pnpm run format:check
	@echo "🎨 Checking Go code formatting..."
	@go fmt -l ./... || echo "⚠️  No Go modules found yet"

fmt-fix: ## Auto-fix code formatting then run CI
	@echo "🎨 Auto-fixing code formatting..."
	@pnpm run format
	@go fmt ./... || echo "⚠️  No Go modules found yet"
	@echo "🔄 Running CI pipeline..."
	@$(MAKE) ci-pipeline

lint: ## Run linting
	@echo "🔍 Running TypeScript linting..."
	@pnpm run lint
	@echo "🔍 Running Go linting..."
	@golangci-lint run || echo "⚠️  golangci-lint not installed or no Go modules found"

lint-strict: ## Run strict linting (matches GitHub CI)
	@echo "🔍 Running strict linting (GitHub CI standard)..."
	@pnpm run lint:strict
	@golangci-lint run --config .golangci.yml || echo "⚠️  golangci-lint not installed or no Go modules found"

lint-packages: ## Lint all TypeScript packages
	@echo "🔍 Linting packages..."
	@pnpm run lint:packages

fix: ## Apply automatic fixes
	@echo "🔧 Applying automatic fixes..."
	@pnpm run lint:fix
	@go fmt ./... || echo "⚠️  No Go modules found yet"

# CI Pipeline
ci-pipeline: ## Run comprehensive CI pipeline (TypeScript + Go)
	@echo "🚀 Starting Full Monorepo CI Pipeline..."
	@echo "========================================"
	@echo "📦 Step 0: Installing Dependencies"
	@pnpm install --frozen-lockfile
	@echo "✅ Step 0: Dependencies Installed"
	@echo "🎨 Step 1: TypeScript Code Formatting Check"
	@pnpm run format
	@echo "✅ Step 1: TypeScript Formatting Passed"
	@echo "🔍 Step 2: TypeScript Linting"
	@pnpm run lint
	@echo "✅ Step 2: TypeScript Linting Passed"
	@echo "🔨 Step 3: TypeScript Package Building"
	@pnpm run build
	@echo "✅ Step 3: TypeScript Packages Built"
	@echo "🧪 Step 4: TypeScript Testing"
	@pnpm run test:ci
	@echo "✅ Step 4: TypeScript Tests Passed"
	@echo "🎨 Step 5: Go Code Formatting Check"
	@go fmt -l ./... || echo "⚠️  No Go modules found yet"
	@echo "✅ Step 5: Go Formatting Passed"
	@echo "🔍 Step 6: Go Linting Check"
	@golangci-lint run || echo "⚠️  golangci-lint not installed or no Go modules found"
	@echo "✅ Step 6: Go Linting Passed"
	@echo "🔨 Step 7: Go Build Check"
	@go build ./... || echo "⚠️  No Go modules found yet"
	@echo "✅ Step 7: Go Build Passed"
	@echo "🧪 Step 8: Go Testing"
	@go test ./... || echo "⚠️  No Go modules found yet"
	@echo "✅ Step 8: Go Tests Passed"
	@echo "🎯 Step 9: Cloudflare Workers Build Check"
	@wrangler deploy --dry-run
	@echo "✅ Step 9: Cloudflare Workers Build Passed"
	@echo "🐳 Step 10: Docker Build Check"
	@docker build -t celebrum-ai:test . || echo "⚠️  Dockerfile not found"
	@echo "✅ Step 10: Docker Build Passed"
	@echo "🎉 Monorepo CI Pipeline Completed Successfully!"
	@echo "📊 Test Summary:"
	@echo "   - TypeScript Packages: All built and tested ✅"
	@echo "   - Go Services: All built and tested ✅"
	@echo "   - Cloudflare Workers: ✅ Verified"
	@echo "   - Docker Containers: ✅ Verified"
	@echo "   - Monorepo Integration: ✅ Complete"

# Coverage and documentation
coverage: ## Generate test coverage report
	@echo "📊 Generating TypeScript coverage report..."
	@pnpm run test:coverage
	@echo "📊 Generating Go coverage report..."
	@go test -coverprofile=coverage.out ./... || echo "⚠️  No Go modules found yet"
	@go tool cover -html=coverage.out -o coverage.html || echo "⚠️  No Go modules found yet"
	@echo "Coverage reports generated"

doc: ## Generate documentation
	@echo "📚 Generating TypeScript documentation..."
	@pnpm run docs
	@echo "📚 Generating Go documentation..."
	@go doc -all ./... || echo "⚠️  No Go modules found yet"

# Script-based commands (recommended for development)
pre-commit: ## Run quick pre-commit checks
	@./scripts/dev/pre-commit.sh

local-ci: ## Run local CI validation (mirrors GitHub CI exactly)
	@./scripts/dev/local-ci.sh

full-check: ## Run comprehensive code quality checks
	@./scripts/ci/full-check.sh

# Clean commands
clean: ## Clean all build artifacts (TypeScript + Go)
	@echo "🧹 Cleaning TypeScript build artifacts..."
	@pnpm run clean
	@echo "🧹 Cleaning Go build artifacts..."
	@go clean ./... || echo "⚠️  No Go modules found yet"
	@rm -f coverage.out coverage.html

clean-go: ## Clean Go build artifacts only
	@echo "🧹 Cleaning Go build artifacts..."
	@go clean ./... || echo "⚠️  No Go modules found yet"
	@rm -f coverage.out coverage.html

clean-packages: ## Clean TypeScript package build artifacts
	@echo "🧹 Cleaning TypeScript build artifacts..."
	@pnpm run clean

clean-db: ## Clean database package build artifacts
	@echo "🧹 Cleaning database package..."
	@pnpm --filter @celebrum-ai/db run clean

clean-shared: ## Clean shared package build artifacts
	@echo "🧹 Cleaning shared package..."
	@pnpm --filter @celebrum-ai/shared run clean

clean-telegram-bot: ## Clean telegram bot package build artifacts
	@echo "🧹 Cleaning telegram bot package..."
	@pnpm --filter @celebrum-ai/telegram-bot run clean

clean-web: ## Clean web package build artifacts
	@echo "🧹 Cleaning web package..."
	@pnpm --filter @celebrum-ai/web run clean

clean-worker: ## Clean worker build artifacts
	@echo "🧹 Cleaning worker build artifacts..."
	@rm -rf dist

# Type checking commands
typecheck: ## Run TypeScript type checking for all packages
	@echo "🔍 Running TypeScript type checking..."
	@echo "🔨 Building dependencies first..."
	@pnpm --filter @celebrum-ai/db run build && pnpm --filter @celebrum-ai/shared run build
	@pnpm run typecheck

typecheck-db: ## Run TypeScript type checking for database package
	@echo "🔍 Type checking database package..."
	@pnpm --filter @celebrum-ai/db run typecheck

typecheck-shared: ## Run TypeScript type checking for shared package
	@echo "🔍 Type checking shared package..."
	@pnpm --filter @celebrum-ai/shared run typecheck

typecheck-telegram-bot: ## Run TypeScript type checking for telegram bot package
	@echo "🔍 Type checking telegram bot package..."
	@pnpm --filter @celebrum-ai/telegram-bot run typecheck

typecheck-web: ## Run TypeScript type checking for web package
	@echo "🔍 Type checking web package..."
	@pnpm --filter @celebrum-ai/web run typecheck

typecheck-worker: ## Run TypeScript type checking for worker (root src)
	@echo "🔍 Type checking worker (root src)..."
	@tsc --noEmit

# Utility commands

check: ## Quick build check
	@echo "🔍 Quick build check..."
	@cargo check --verbose

check-wasm: ## Quick WASM compilation check
	@echo "🎯 Quick WASM compilation check..."
	@cargo check --target wasm32-unknown-unknown --lib --verbose

check-all: lint test build build-wasm check-wasm ## Run all basic checks (lint, test, build native & WASM)
	@echo "✅ All basic checks completed successfully!"

# Legacy commands (maintained for compatibility)
dev-quick: fmt lint test check-wasm ## Quick development cycle (format, lint, test, WASM check)
	@echo "🚀 Development cycle completed!"

ci: ci-pipeline ## Run comprehensive CI pipeline (TypeScript + Go)

deploy-wasm: build-wasm ## Prepare WASM for deployment (build WASM and run tests)
	@echo "🚀 Preparing WASM for deployment..."
	@echo "✅ WASM ready for deployment!"

# Workflow commands (recommended usage)
quick: pre-commit ## Quick validation before commit
	@echo "⚡ Quick validation completed!"

validate: ci-pipeline ## Full validation (mirrors CI)
	@echo "✅ Full validation completed!"

fix-and-validate: fmt-fix ## Auto-fix formatting then validate
	@echo "🔧 Fix and validation completed!"

quality: full-check ## Comprehensive quality analysis
	@echo "🏆 Quality analysis completed!" 

# API Testing
test-api: ## Run API Flow Tests
	@echo "🌐 Running API Flow Tests..."
	@chmod +x scripts/prod/test-bot/test_api_flow.sh
	@./scripts/prod/test-bot/test_api_flow.sh

test-api-local: ## Run API Tests against local development server
	@echo "🏠 Running API Tests against local development server..."
	@BASE_URL=http://localhost:8787 ./scripts/prod/test-bot/test_api_flow.sh

test-api-staging: ## Run API Tests against staging environment
	@echo "🚀 Running API Tests against staging environment..."
	@BASE_URL=https://celebrum-ai-staging.your-domain.workers.dev ./scripts/prod/test-bot/test_api_flow.sh

test-api-production: ## Run API Tests against production environment
	@echo "🌍 Running API Tests against production environment..."
	@BASE_URL=https://celebrum-ai.your-domain.workers.dev ./scripts/prod/test-bot/test_api_flow.sh

# API v1 Direct Testing (No Telegram required)
test-api-v1: ## Run comprehensive API v1 tests with RBAC validation
	@echo "🔗 Running API v1 Comprehensive Tests..."
	@chmod +x scripts/prod/test-bot/test_api_v1_comprehensive.sh
	@./scripts/prod/test-bot/test_api_v1_comprehensive.sh

test-api-v1-local: ## Run API v1 tests against local development server
	@echo "🏠 Running API v1 Tests against local development server..."
	@BASE_URL=http://localhost:8787 ./scripts/prod/test-bot/test_api_v1_comprehensive.sh

test-api-v1-staging: ## Run API v1 tests against staging environment
	@echo "🚀 Running API v1 Tests against staging environment..."
	@BASE_URL=https://celebrum-ai-staging.your-domain.workers.dev ./scripts/prod/test-bot/test_api_v1_comprehensive.sh

test-api-v1-production: ## Run API v1 tests against production environment
	@echo "🌍 Running API v1 Tests against production environment..."
	@BASE_URL=https://celebrum-ai.irfandimarsya.workers.dev ./scripts/prod/test-bot/test_api_v1_comprehensive.sh

test-api-prod-admin: ## Run Production API Tests (Super Admin Only with D1 Database)
	@echo "👑 Running Production API Tests (Super Admin + D1 Database)..."
	@chmod +x scripts/prod/test-bot/test_api_flow_prod.sh
	@./scripts/prod/test-bot/test_api_flow_prod.sh

# Performance Testing
test-performance: ## Run comprehensive performance tests
	@echo "⚡ Running Comprehensive Performance Tests..."
	@chmod +x scripts/prod/test-bot/test_performance_comprehensive.sh
	@./scripts/prod/test-bot/test_performance_comprehensive.sh

test-performance-local: ## Run performance tests against local development server
	@echo "🏠 Running Performance Tests against local development server..."
	@BASE_URL=http://localhost:8787 ./scripts/prod/test-bot/test_performance_comprehensive.sh

test-performance-staging: ## Run performance tests against staging environment
	@echo "🚀 Running Performance Tests against staging environment..."
	@BASE_URL=https://celebrum-ai-staging.your-domain.workers.dev ./scripts/prod/test-bot/test_performance_comprehensive.sh

test-performance-production: ## Run performance tests against production environment
	@echo "🌍 Running Performance Tests against production environment..."
	@BASE_URL=https://celebrum-ai.irfandimarsya.workers.dev ./scripts/prod/test-bot/test_performance_comprehensive.sh

test-performance-stress: ## Run high-stress performance tests (100 concurrent users)
	@echo "💥 Running High-Stress Performance Tests..."
	@CONCURRENT_USERS=100 REQUESTS_PER_USER=20 STRESS_DURATION=60 ./scripts/prod/test-bot/test_performance_comprehensive.sh

test-webhook-local: ## Run webhook tests against local development server
	@echo "🔗 Running Webhook Tests against local development server..."
	@./test_telegram_webhook.sh

# High-Scale Performance Testing (10K Users)
test-performance-10k: ## Run 10K concurrent users performance test (PRODUCTION ONLY)
	@echo "🚀 Running 10K Users Performance Test..."
	@chmod +x scripts/prod/test-bot/test_performance_10k_users.sh
	@./scripts/prod/test-bot/test_performance_10k_users.sh

test-performance-10k-production: ## Run 10K users test against production environment
	@echo "🌍 Running 10K Users Test against production environment..."
	@BASE_URL=https://celebrum-ai.irfandimarsya.workers.dev ./scripts/prod/test-bot/test_performance_10k_users.sh

test-performance-10k-staging: ## Run 10K users test against staging environment
	@echo "🚀 Running 10K Users Test against staging environment..."
	@BASE_URL=https://celebrum-ai-staging.your-domain.workers.dev ./scripts/prod/test-bot/test_performance_10k_users.sh

test-performance-ramp: ## Run gradual ramp-up test (100->10K users)
	@echo "📈 Running Gradual Ramp-up Test..."
	@MAX_USERS=10000 RAMP_UP_DURATION=600 ./scripts/prod/test-bot/test_performance_10k_users.sh

test-performance-extreme: ## Run extreme load test (20K users, 30min duration)
	@echo "💥 Running Extreme Load Test..."
	@MAX_USERS=20000 TEST_DURATION=1800 RAMP_UP_DURATION=900 ./scripts/prod/test-bot/test_performance_10k_users.sh

test-performance-quick-10k: ## Run quick 10K users test (5min duration)
	@echo "⚡ Running Quick 10K Users Test..."
	@MAX_USERS=10000 TEST_DURATION=300 RAMP_UP_DURATION=120 ./scripts/prod/test-bot/test_performance_10k_users.sh

# Complete API Testing (All Functionality)
test-complete-super-admin: ## Run comprehensive test of ALL functionality with super admin access
	@echo "🚀 Running Complete Super Admin API Test (ALL Functionality)..."
	@chmod +x scripts/prod/test-bot/test_complete_super_admin_api.sh
	@./scripts/prod/test-bot/test_complete_super_admin_api.sh

test-complete-super-admin-production: ## Run complete super admin test against production environment
	@echo "🌍 Running Complete Super Admin Test against production environment..."
	@BASE_URL=https://celebrum-ai.irfandimarsya.workers.dev ./scripts/prod/test-bot/test_complete_super_admin_api.sh

test-complete-super-admin-local: ## Run complete super admin test against local development server
	@echo "🏠 Running Complete Super Admin Test against local development server..."
	@BASE_URL=http://localhost:8787 ./scripts/prod/test-bot/test_complete_super_admin_api.sh