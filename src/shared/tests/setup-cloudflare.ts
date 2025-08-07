/**
 * Production-ready Cloudflare Workers test setup
 * 
 * This setup uses the official @cloudflare/vitest-pool-workers integration
 * which runs tests inside the actual Workers runtime (workerd) for maximum
 * compatibility with production environments.
 */
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:test';

// Define the expected environment interface for our tests
interface TestEnv {
  DB: D1Database;
  CELEBRUM_KV: KVNamespace;
  PROD_BOT_MARKET_CACHE: KVNamespace;
  PROD_BOT_SESSION_STORE: KVNamespace;
  CELEBRUM_STORAGE: DurableObjectNamespace;
  ENVIRONMENT?: string;
  STAGE?: string;
}

// Type for the provided environment from cloudflare:test
interface ProvidedEnv {
  DB: D1Database;
  CELEBRUM_KV: KVNamespace;
  PROD_BOT_MARKET_CACHE: KVNamespace;
  PROD_BOT_SESSION_STORE: KVNamespace;
  CELEBRUM_STORAGE: DurableObjectNamespace;
  STAGE?: string;
}

// Global test environment
export let testEnv: TestEnv;

beforeAll(async () => {
  console.log('Initializing Cloudflare Workers test environment...');
  
  // The env object is automatically populated by the Workers Vitest integration
  // with bindings from wrangler.jsonc (test environment)
  const providedEnv = env as ProvidedEnv;
  testEnv = {
    ...providedEnv,
    ENVIRONMENT: 'test',
    STAGE: providedEnv.STAGE || 'test'
  };
  
  // Validate that required bindings are available
  if (!testEnv.DB) {
    throw new Error('D1 database binding (DB) not available in test environment');
  }
  
  console.log('Cloudflare Workers test environment initialized successfully');
}, 30000);

beforeEach(async () => {
  // Reset any test-specific state before each test
  console.log('Preparing test environment...');
  
  // The Workers Vitest integration provides isolated storage per test
  // No manual cleanup needed as each test gets fresh bindings
});

afterEach(async () => {
  // Cleanup after each test if needed
  console.log('Cleaning up test environment...');
});

afterAll(async () => {
  console.log('Cloudflare Workers test environment cleanup complete');
});

/**
 * Helper to create a test request
 */
export function createTestRequest(
  url = 'https://example.com',
  options: RequestInit = {}
): Request {
  return new Request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Helper to create test context for Workers
 */
export function createTestContext() {
  return {
    env: testEnv,
    ctx: {
      waitUntil: (promise: Promise<any>) => promise,
      passThroughOnException: () => {},
    },
  };
}

/**
 * Helper to test D1 database operations
 */
export async function testD1Operation<T>(
  operation: (db: D1Database) => Promise<T>
): Promise<T> {
  if (!testEnv.DB) {
    throw new Error('D1 database binding not available in test environment');
  }
  
  return await operation(testEnv.DB);
}

/**
 * Helper to test KV operations
 */
export async function testKVOperation<T>(
  namespace: keyof Pick<TestEnv, 'CELEBRUM_KV' | 'PROD_BOT_MARKET_CACHE' | 'PROD_BOT_SESSION_STORE'>,
  operation: (kv: KVNamespace) => Promise<T>
): Promise<T> {
  const kv = testEnv[namespace];
  if (!kv) {
    throw new Error(`KV namespace ${namespace} not available in test environment`);
  }
  
  return await operation(kv);
}

/**
 * Helper to test Durable Object operations
 */
export async function testDurableObjectOperation<T>(
  operation: (stub: DurableObjectStub) => Promise<T>
): Promise<T> {
  if (!testEnv.CELEBRUM_STORAGE) {
    throw new Error('Durable Object binding not available in test environment');
  }
  
  const id = testEnv.CELEBRUM_STORAGE.idFromName('test-object');
  const stub = testEnv.CELEBRUM_STORAGE.get(id);
  
  return await operation(stub);
}