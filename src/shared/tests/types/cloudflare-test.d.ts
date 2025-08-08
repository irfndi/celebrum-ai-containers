/**
 * Type declarations for Cloudflare Workers test environment
 * Extends the ProvidedEnv interface from @cloudflare/vitest-pool-workers
 * to include our custom bindings defined in wrangler.jsonc
 */

import type { D1Database, KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    // D1 Database binding
    DB: D1Database;
    
    // KV Namespace bindings
    CELEBRUM_KV: KVNamespace;
    PROD_BOT_MARKET_CACHE: KVNamespace;
    PROD_BOT_SESSION_STORE: KVNamespace;
    
    // Durable Object bindings
    CELEBRUM_STORAGE: DurableObjectNamespace;
    
    // Environment variables
    STAGE: string;
    ALCHEMY_MANAGED: string;
    CONTAINER_VERSION: string;
    DEPLOYMENT_STRATEGY: string;
  }
}