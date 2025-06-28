# Alchemy.run Integration for Celebrum AI

This document describes the integration of Alchemy.run for Infrastructure-as-Code (IaC) management of Cloudflare Containers in the Celebrum AI project.

## Overview

Alchemy.run is a TypeScript-native Infrastructure-as-Code library that provides declarative infrastructure management. This integration allows us to manage Cloudflare Containers, Workers, and related infrastructure through code.

## Features

- **Declarative Infrastructure**: Define infrastructure in TypeScript
- **Cloudflare Integration**: Native support for Cloudflare services
- **Container Management**: Automated container deployment and scaling
- **Environment Management**: Support for development, staging, and production environments
- **Monitoring & Health Checks**: Built-in health monitoring endpoints
- **Error Handling**: Enhanced error reporting and logging

## Installation

The Alchemy package is already installed in this project:

```bash
pnpm add alchemy
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Cloudflare Configuration (Required)
CLOUDFLARE_ACCOUNT_ID="your_cloudflare_account_id"
CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"

# Alchemy Configuration
ALCHEMY_ENVIRONMENT="development"  # development, staging, production
ALCHEMY_DRY_RUN="false"           # Set to true for dry-run deployments
ALCHEMY_VERBOSE="true"            # Enable verbose logging

# Container Configuration
CONTAINER_MESSAGE="Hello from Alchemy-managed container!"
CONTAINER_NODE_ENV="development"
```

### Alchemy Configuration File

The main configuration is in `alchemy.run.ts`:

```typescript
import alchemy from 'alchemy';
import { CloudflareProvider } from 'alchemy/providers/cloudflare';

const cloudflare = new CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

const celebrumContainer = cloudflare.container({
  name: 'celebrum-ai-container',
  image: 'celebrum-ai:latest',
  environment: {
    MESSAGE: 'Hello from Alchemy-managed container!',
    NODE_ENV: 'production',
  },
  ports: [8080],
  resources: {
    cpu: '0.5',
    memory: '512Mi',
  },
});

export default alchemy({
  providers: [cloudflare],
  resources: {
    container: celebrumContainer,
  },
});
```

## Deployment Scripts

### Available Commands

```bash
# Production deployment
pnpm run deploy:alchemy

# Staging deployment
pnpm run deploy:alchemy:staging

# Development deployment
pnpm run deploy:alchemy:dev

# Dry run (preview changes without applying)
pnpm run deploy:alchemy:dry-run
```

### Deployment Process

The deployment script (`scripts/deploy-alchemy.ts`) performs the following steps:

1. **Environment Validation**: Checks required environment variables
2. **Container Build**: Builds the Docker container image
3. **Infrastructure Deployment**: Applies Alchemy configuration
4. **Deployment Validation**: Verifies the deployment is successful

### Manual Deployment

```bash
# Run deployment script directly
npx tsx scripts/deploy-alchemy.ts production

# With options
npx tsx scripts/deploy-alchemy.ts production --dry-run --verbose
```

## Container Configuration

### Updated Container Class

The `CelebrumContainer` class in `src/index.ts` includes:

- **Enhanced Logging**: Alchemy-prefixed logs for better monitoring
- **Error Reporting**: Detailed error information with timestamps
- **Environment Variables**: Alchemy-specific configuration
- **Lifecycle Hooks**: Start, stop, and error handling

### Wrangler Configuration

The `wrangler.jsonc` has been updated to:

- Use `CelebrumContainer` class name
- Include Alchemy-specific environment variables
- Configure container bindings for the new class

## Monitoring & Health Checks

### Available Endpoints

- `GET /` - Main endpoint with Alchemy information
- `GET /health` - Health check endpoint for monitoring
- `GET /alchemy/status` - Detailed Alchemy deployment status
- `GET /container/:id` - Container-specific endpoints
- `GET /lb` - Load-balanced container access
- `GET /singleton` - Single container instance

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00.000Z",
  "alchemy": {
    "managed": true,
    "version": "1.0.0",
    "strategy": "alchemy"
  }
}
```

### Alchemy Status Response

```json
{
  "deployment": {
    "managed_by_alchemy": true,
    "container_version": "1.0.0",
    "deployment_strategy": "alchemy",
    "container_class": "CelebrumContainer",
    "last_updated": "2025-01-27T10:00:00.000Z"
  },
  "infrastructure": {
    "provider": "Cloudflare",
    "container_runtime": "Cloudflare Containers",
    "worker_runtime": "Cloudflare Workers"
  }
}
```

## Development Workflow

### Local Development

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Configure your Cloudflare credentials
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Build Container**:
   ```bash
   docker build -t celebrum-ai:latest .
   ```

4. **Deploy to Development**:
   ```bash
   pnpm run deploy:alchemy:dev
   ```

### Testing Deployment

1. **Dry Run**:
   ```bash
   pnpm run deploy:alchemy:dry-run
   ```

2. **Deploy to Staging**:
   ```bash
   pnpm run deploy:alchemy:staging
   ```

3. **Validate Deployment**:
   ```bash
   curl https://your-worker-url.workers.dev/health
   curl https://your-worker-url.workers.dev/alchemy/status
   ```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**:
   - Ensure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
   - Check `.env` file configuration

2. **Container Build Failures**:
   - Verify Docker is running
   - Check Dockerfile syntax
   - Ensure all dependencies are available

3. **Deployment Failures**:
   - Verify Cloudflare API token permissions
   - Check account ID is correct
   - Review deployment logs for specific errors

### Debug Mode

Enable verbose logging:

```bash
ALCHEMY_VERBOSE=true pnpm run deploy:alchemy:dev
```

### Logs

Container logs include Alchemy-specific prefixes:

```
[Alchemy] Celebrum AI Container successfully started
[Alchemy] Container managed by Alchemy.run
[Alchemy] Error details: { name: "Error", message: "...", ... }
```

## Security Considerations

1. **API Tokens**: Store Cloudflare API tokens securely
2. **Environment Variables**: Never commit `.env` files
3. **Container Security**: Follow container security best practices
4. **Access Control**: Implement proper access controls for production

## Next Steps

1. **CI/CD Integration**: Integrate Alchemy deployment with GitHub Actions
2. **Multi-Environment**: Set up separate configurations for each environment
3. **Monitoring**: Implement comprehensive monitoring and alerting
4. **Scaling**: Configure auto-scaling based on load
5. **Backup & Recovery**: Implement backup and disaster recovery procedures

## Resources

- [Alchemy.run Documentation](https://alchemy.run/docs)
- [Cloudflare Containers Documentation](https://developers.cloudflare.com/containers/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework Documentation](https://hono.dev/)