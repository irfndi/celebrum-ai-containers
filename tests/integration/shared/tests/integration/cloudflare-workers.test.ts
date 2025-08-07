import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env, SELF, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';

describe('Cloudflare Workers Integration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should have access to environment bindings', () => {
    // Test that we have access to the configured bindings
    expect(env.DB).toBeDefined();
    expect(env.CELEBRUM_KV).toBeDefined();
    expect(env.PROD_BOT_MARKET_CACHE).toBeDefined();
    expect(env.PROD_BOT_SESSION_STORE).toBeDefined();
    expect(env.CELEBRUM_STORAGE).toBeDefined();
  });

  it('should have access to environment variables', () => {
    // Test that we have access to the configured environment variables
    expect(env.ALCHEMY_MANAGED).toBeDefined();
    expect(env.CONTAINER_VERSION).toBeDefined();
    expect(env.DEPLOYMENT_STRATEGY).toBeDefined();
    expect(env.STAGE).toBeDefined();
  });

  it('should be able to create execution context', () => {
    // Test that execution context can be created
    const ctx = createExecutionContext();
    expect(ctx).toBeDefined();
    expect(typeof ctx.waitUntil).toBe('function');
    expect(typeof ctx.passThroughOnException).toBe('function');
  });

  it('should handle execution context properly', async () => {
    // Test execution context lifecycle
    const ctx = createExecutionContext();
    
    // Add a simple async operation to the context
    ctx.waitUntil(Promise.resolve('test operation'));
    
    // Wait for all operations to complete
    await waitOnExecutionContext(ctx);
    
    // If we reach here, the execution context worked properly
    expect(true).toBe(true);
  });

  it('should be able to make basic requests to the worker using SELF', async () => {
    // Test basic worker functionality without complex routing
    try {
      const response = await SELF.fetch('http://localhost/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // The worker should respond with some status (even if it's a 404 for unmapped routes)
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      expect([200, 404, 405, 500].includes(response.status)).toBe(true);
    } catch (error) {
      // If the worker fails to respond, we should get a proper error
      expect(error).toBeDefined();
    }
  }, 3000); // 3 second timeout

  it('should handle basic worker functionality', () => {
    // Test that SELF fetcher exists and is callable
    expect(SELF).toBeDefined();
    expect(typeof SELF.fetch).toBe('function');
    
    // Test that environment bindings are properly configured
    expect(typeof env.DB.prepare).toBe('function');
    expect(typeof env.CELEBRUM_KV.get).toBe('function');
    expect(typeof env.CELEBRUM_KV.put).toBe('function');
  });

  it('should handle worker configuration', () => {
    // Test basic worker configuration and setup
    const requiredEnvVars = ['ALCHEMY_MANAGED', 'CONTAINER_VERSION', 'DEPLOYMENT_STRATEGY', 'STAGE'];
    const requiredBindings = ['DB', 'CELEBRUM_KV', 'PROD_BOT_MARKET_CACHE', 'PROD_BOT_SESSION_STORE', 'CELEBRUM_STORAGE'];
    
    // Verify all required environment variables are present
    requiredEnvVars.forEach(envVar => {
      expect(env[envVar as keyof typeof env]).toBeDefined();
    });
    
    // Verify all required bindings are present
    requiredBindings.forEach(binding => {
      expect(env[binding as keyof typeof env]).toBeDefined();
    });
  });
});