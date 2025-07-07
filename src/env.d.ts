declare module "cloudflare:test" {
  interface ProvidedEnv {
    // Bindings from wrangler.jsonc
    DB: D1Database;
    CELEBRUM_KV: KVNamespace;
    PROD_BOT_MARKET_CACHE: KVNamespace;
    PROD_BOT_SESSION_STORE: KVNamespace;
    CELEBRUM_STORAGE: DurableObjectNamespace;
    
    // Environment variables
    ALCHEMY_MANAGED?: string;
    CONTAINER_VERSION?: string;
    DEPLOYMENT_STRATEGY?: string;
    STAGE?: string;
    ENVIRONMENT?: string;
  }

  // Test helpers
  export const env: ProvidedEnv;
  export const SELF: Fetcher;
  export function createExecutionContext(): ExecutionContext;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
  export function runInDurableObject<T>(
    stub: DurableObjectStub,
    callback: (instance: DurableObject, state: DurableObjectState) => Promise<T>
  ): Promise<T>;
  export function runDurableObjectAlarm(stub: DurableObjectStub): Promise<boolean>;
  export function listDurableObjectIds(namespace: DurableObjectNamespace): Promise<DurableObjectId[]>;
  
  // Fetch mocking
  export const fetchMock: {
    activate(): void;
    deactivate(): void;
    disableNetConnect(): void;
    enableNetConnect(): void;
    assertNoPendingInterceptors(): void;
    get(origin: string): MockInterceptor;
    post(origin: string): MockInterceptor;
    put(origin: string): MockInterceptor;
    patch(origin: string): MockInterceptor;
    delete(origin: string): MockInterceptor;
    head(origin: string): MockInterceptor;
    options(origin: string): MockInterceptor;
  };

  interface MockInterceptor {
    intercept(options: { path: string | RegExp; method?: string }): MockInterceptor;
    reply(statusCode: number, body?: any, headers?: Record<string, string>): MockInterceptor;
  }
}

// Re-export types for convenience
export type { ProvidedEnv } from "cloudflare:test";