#!/bin/bash
# Deployment script for ArbEdge monorepo
# Usage: ./deploy.sh [package-name] [environment]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}🚀 ArbEdge Deployment Script${NC}"
    echo -e "${BLUE}=============================${NC}"
}

print_usage() {
    echo -e "${YELLOW}Usage: $0 [package] [environment]${NC}"
    echo -e "${YELLOW}Packages:${NC}"
    echo -e "  ${CYAN}worker${NC}        - Deploy Cloudflare Worker"
    echo -e "  ${CYAN}telegram-bot${NC}  - Deploy Telegram Bot Worker"
    echo -e "  ${CYAN}web${NC}           - Deploy Astro web application"
    echo -e "  ${CYAN}all${NC}           - Deploy all packages"
    echo -e "${YELLOW}Environments:${NC}"
    echo -e "  ${CYAN}production${NC}    - Deploy to production"
    echo -e "  ${CYAN}staging${NC}       - Deploy to staging"
    echo -e "  ${CYAN}development${NC}   - Deploy to development (default)"
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  ${CYAN}$0 worker production${NC}  - Deploy worker to production"
    echo -e "  ${CYAN}$0 all staging${NC}        - Deploy all packages to staging"
    echo -e "  ${CYAN}$0 worker${NC}             - Deploy worker to development"
    echo -e "  ${CYAN}$0 web production${NC}     - Deploy web to production"
}

check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ Wrangler CLI not found. Install it with: npm install -g wrangler${NC}"
        exit 1
    fi
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        echo -e "${YELLOW}⚠️ Not logged in to Cloudflare. Please run: wrangler login${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

build_packages() {
    echo -e "${BLUE}🔨 Building packages...${NC}"
    pnpm run build
    echo -e "${GREEN}✅ Build completed${NC}"
}

run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    pnpm run test:ci
    echo -e "${GREEN}✅ Tests passed${NC}"
}

deploy_worker() {
    local env=${1:-development}
    echo -e "${GREEN}⚡ Deploying Worker to ${env}...${NC}"
    
    # Worker is deployed from root directory
    
    case "$env" in
        "production")
            pnpm run deploy:alchemy
            ;;
        "staging")
            pnpm run deploy:alchemy:staging
            ;;
        "development")
            pnpm run deploy:alchemy:dev
            ;;
        *)
            echo -e "${RED}❌ Unknown environment: $env${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Worker deployed to ${env}${NC}"
}



deploy_telegram_bot() {
    local env=${1:-development}
    echo -e "${GREEN}📱 Deploying Telegram Bot to ${env}...${NC}"
    
    cd src/telegram-bot
    
    case "$env" in
        "production")
            pnpm run deploy:alchemy
            ;;
        "staging")
            pnpm run deploy:alchemy:staging
            ;;
        "development")
            pnpm run deploy:alchemy:dev
            ;;
        *)
            echo -e "${RED}❌ Unknown environment: $env${NC}"
            exit 1
            ;;
    esac
    
    cd ../..
    echo -e "${GREEN}✅ Telegram Bot deployed to ${env}${NC}"
}

deploy_web() {
    local env=${1:-development}
    echo -e "${GREEN}🌐 Deploying Web App to ${env}...${NC}"
    
    cd src/web
    
    case "$env" in
        "production")
            wrangler pages deploy ./dist --project-name=celebrum-ai-web --branch=main
            ;;
        "staging")
            wrangler pages deploy ./dist --project-name=celebrum-ai-web --branch=staging
            ;;
        "development")
            wrangler pages deploy ./dist --project-name=celebrum-ai-web --branch=development
            ;;
        *)
            echo -e "${RED}❌ Unknown environment: $env${NC}"
            exit 1
            ;;
    esac
    
    cd ../..
    echo -e "${GREEN}✅ Web App deployed to ${env}${NC}"
}

deploy_all() {
    local env=${1:-development}
    echo -e "${GREEN}🚀 Deploying all packages to ${env}...${NC}"
    
    deploy_worker "$env"
    deploy_telegram_bot "$env"
    deploy_web "$env"
    
    echo -e "${GREEN}✅ All packages deployed to ${env}${NC}"
}

# Main script
print_header

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ Please run this script from the Celebrum AI root directory${NC}"
    exit 1
fi

# Parse arguments
PACKAGE=${1:-}
ENVIRONMENT=${2:-development}

if [ -z "$PACKAGE" ]; then
    print_usage
    exit 1
fi

# Validate environment
case "$ENVIRONMENT" in
    "development" | "staging" | "production")
        echo -e "${BLUE}🎯 Target environment: ${ENVIRONMENT}${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        print_usage
        exit 1
        ;;
esac

# Run deployment
check_prerequisites
build_packages
run_tests

case "$PACKAGE" in
    "worker")
        deploy_worker "$ENVIRONMENT"
        ;;
    "telegram-bot")
        deploy_telegram_bot "$ENVIRONMENT"
        ;;
    "web")
        deploy_web "$ENVIRONMENT"
        ;;
    "all")
        deploy_all "$ENVIRONMENT"
        ;;
    "help" | "-h" | "--help")
        print_usage
        ;;
    *)
        echo -e "${RED}❌ Unknown package: $PACKAGE${NC}"
        print_usage
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"