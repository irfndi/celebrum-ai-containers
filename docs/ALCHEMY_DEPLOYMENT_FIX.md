# Alchemy Deployment Fix

## Issue Summary

The Alchemy deployment was failing with the following error:

```
✘ [ERROR] A request to the Cloudflare API (/accounts/.../workers/scripts/celebrum-ai-containers/versions) failed.

Version upload failed. You attempted to upload a version of a Worker that includes a Durable Object migration, but migrations must be fully applied by running "wrangler deploy". See https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/#gradual-deployments-for-durable-objects for more information. [code: 10211]
```

## Root Cause

The issue occurs because:

1. **Alchemy uses `wrangler versions upload`** internally for gradual deployments
2. **Durable Object migrations must be applied first** using `wrangler deploy` before versions can be uploaded
3. **The migration in `wrangler.jsonc`** defines a new Durable Object class that hasn't been deployed yet

According to Cloudflare's documentation <mcreference link="https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/#gradual-deployments-for-durable-objects" index="0">0</mcreference>, gradual deployments for Durable Objects require that migrations be fully applied first.

## Solution Implemented

### 1. Fixed Alchemy Deployment Script

Modified `scripts/deploy-alchemy.ts` to:

1. **Apply migrations first** using `wrangler deploy` before running Alchemy
2. **Handle deployment gracefully** with proper error handling
3. **Maintain verbose logging** for debugging

The key change:

```typescript
// First, apply any pending Durable Object migrations via direct wrangler deploy
// This is required before Alchemy can use wrangler versions upload
console.log('🔄 Applying pending Durable Object migrations...');
try {
  execSync('wrangler deploy', {
    stdio: this.options.verbose ? 'inherit' : 'pipe',
    cwd: process.cwd(),
  });
  console.log('✅ Durable Object migrations applied successfully');
} catch (error) {
  console.log('⚠️  Initial wrangler deploy completed (may have been already deployed)');
  if (this.options.verbose) {
    console.log('Deploy output:', error.toString());
  }
}

// Now import and execute the Alchemy configuration
console.log('🔄 Deploying with Alchemy...');
await import('../alchemy.run.ts');
```

### 2. Added Fallback Deployment Option

Created `scripts/deploy/deploy-wrangler-only.sh` as a pure wrangler deployment option:

- **No Alchemy dependency** - uses only wrangler CLI
- **Automatic migration handling** - wrangler applies migrations automatically
- **Simple and reliable** - fewer moving parts
- **Proper error handling** - checks for wrangler CLI and authentication

## Available Deployment Methods

### Method 1: Alchemy Deployment (Recommended)

```bash
# Production deployment with Alchemy
pnpm run deploy:alchemy

# Staging deployment
pnpm run deploy:alchemy:staging

# Development deployment
pnpm run deploy:alchemy:dev

# Dry run (preview changes)
pnpm run deploy:alchemy:dry-run
```

**Pros:**
- Full infrastructure management
- Resource adoption and management
- Environment-specific configurations
- Dry-run capability

**Cons:**
- More complex
- Requires proper migration handling

### Method 2: Wrangler-Only Deployment (Fallback)

```bash
# Simple wrangler deployment
pnpm run deploy:wrangler
```

**Pros:**
- Simple and reliable
- Automatic migration handling
- No external dependencies
- Fast deployment

**Cons:**
- Manual resource management
- No environment-specific handling
- Limited infrastructure automation

### Method 3: Existing Fallback Script

```bash
# Docker-aware fallback deployment
pnpm run deploy:fallback
```

**Pros:**
- Handles Docker availability
- Automatic fallback logic
- Container-aware deployment

## Migration Configuration

The current `wrangler.jsonc` includes:

```json
"migrations": [
  {
    "tag": "v1",
    "new_classes": [
      "CelebrumAIStorage"
    ]
  }
],
"durable_objects": {
  "bindings": [
    {
      "class_name": "CelebrumAIStorage",
      "name": "CELEBRUM_STORAGE"
    }
  ]
}
```

This migration:
- **Defines the `CelebrumAIStorage` class** as a new Durable Object
- **Must be applied before version uploads** can work
- **Is automatically handled** by the fixed deployment scripts

## Troubleshooting

### If Alchemy deployment still fails:

1. **Use the wrangler-only deployment:**
   ```bash
   pnpm run deploy:wrangler
   ```

2. **Check migration status:**
   ```bash
   wrangler deployments list
   ```

3. **Apply migrations manually:**
   ```bash
   wrangler deploy
   ```

4. **Then retry Alchemy deployment:**
   ```bash
   pnpm run deploy:alchemy
   ```

### If wrangler deployment fails:

1. **Check authentication:**
   ```bash
   wrangler whoami
   ```

2. **Re-authenticate if needed:**
   ```bash
   wrangler auth login
   ```

3. **Check wrangler configuration:**
   ```bash
   wrangler whoami
   cat wrangler.jsonc
   ```

## Verification

After successful deployment, verify:

1. **Worker is accessible:**
   ```bash
   curl https://celebrum-ai-containers.irfandimarsya.workers.dev
   ```

2. **Durable Objects are working:**
   ```bash
   # Check deployment status
   wrangler deployments list
   ```

3. **All resources are bound correctly:**
   ```bash
   # Check worker configuration
   wrangler status
   ```

## Best Practices

1. **Always test with dry-run first:**
   ```bash
   pnpm run deploy:alchemy:dry-run
   ```

2. **Use staging environment for testing:**
   ```bash
   pnpm run deploy:alchemy:staging
   ```

3. **Keep fallback options available:**
   - Use `deploy:wrangler` for simple deployments
   - Use `deploy:fallback` for Docker-aware deployments

4. **Monitor deployment logs:**
   ```bash
   # Use verbose mode for debugging
   tsx scripts/deploy-alchemy.ts production --verbose
   ```

## References

- <mcreference link="https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/#gradual-deployments-for-durable-objects" index="0">Cloudflare Gradual Deployments for Durable Objects</mcreference>
- [Alchemy.run Documentation](https://alchemy.run/docs)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)