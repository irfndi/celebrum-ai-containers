/**
 * Global test setup file
 * Provides common utilities and mocks for all tests
 */

// Fix process.stdout.columns issue that causes wrangler CLI to fail
(() => {
  if (typeof globalThis !== 'undefined') {
    // Ensure process exists
    if (typeof globalThis.process === 'undefined') {
      (globalThis as any).process = {
        env: {},
        argv: ['node', 'test'],
        cwd: () => '/',
        platform: 'linux',
        version: 'v18.0.0'
      };
    }

    const proc = globalThis.process as any;
    
    // Create stdout with proper descriptors to prevent wrangler errors
    if (!proc.stdout || typeof proc.stdout.columns === 'undefined') {
      proc.stdout = {
        ...proc.stdout,
        columns: 80,
        rows: 24,
        isTTY: false,
        write: () => true,
        end: () => {}
      };
    }
    
    // Create stderr similarly
    if (!proc.stderr || typeof proc.stderr.columns === 'undefined') {
      proc.stderr = {
        ...proc.stderr,
        columns: 80,
        rows: 24,
        isTTY: false,
        write: () => true,
        end: () => {}
      };
    }
  }
})();

import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { env as workerEnv } from 'cloudflare:test';

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
  console.error = vi.fn();
  console.info = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

export const testEnv = workerEnv;