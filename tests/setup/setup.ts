import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Mock worker environment for tests
const workerEnv = {
  ALCHEMY_MANAGED: 'true',
  CONTAINER_VERSION: 'test',
  DEPLOYMENT_STRATEGY: 'test',
  STAGE: 'test',
  CELEBRUM_KV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn()
  },
  CELEBRUM_CONTAINERS: {},
  CELEBRUM_DB: {}
};

// The Cloudflare Workers Vitest integration handles Miniflare setup automatically
// No need for manual Miniflare configuration when using @cloudflare/vitest-pool-workers

beforeAll(() => {
  console.log('🧪 Starting test suite with Workers Vitest integration');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  vi.clearAllMocks();
  
  // Set up default environment variables
  // Only set these if process.env exists
  if (typeof process !== 'undefined' && process.env) {
    process.env.NODE_ENV = 'test';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.WEBHOOK_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'test-db';
    // Set environment variables for Cloudflare Worker integration tests
    process.env.ALCHEMY_MANAGED = 'true';
    process.env.CONTAINER_VERSION = 'test';
    process.env.DEPLOYMENT_STRATEGY = 'test';
    process.env.STAGE = 'test';
    // Assign to Worker env as well
    workerEnv.ALCHEMY_MANAGED = process.env.ALCHEMY_MANAGED;
    workerEnv.CONTAINER_VERSION = process.env.CONTAINER_VERSION;
    workerEnv.DEPLOYMENT_STRATEGY = process.env.DEPLOYMENT_STRATEGY;
    workerEnv.STAGE = process.env.STAGE;
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Global fetch mock
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  // Temporarily allow console.error for debugging
  // console.error = vi.fn();
  console.info = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

export const testEnv = workerEnv;