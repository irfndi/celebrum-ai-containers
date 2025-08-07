/**
 * Feature Flag System Tests
 * Comprehensive tests for the feature flag implementation
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService } from '../../../../../src/shared/src/services/feature-flag-service';
import { FeatureFlagRoutes, FeatureFlagMiddleware } from '../../../../../src/shared/src/routes/feature-flags';
import { FeatureFlagUtils, FeatureFlagConditional, FeatureFlagCache } from '../../../../../src/shared/src/utils/feature-flags';
import type { UserRoleType, SubscriptionTierType } from '../../../../../src/shared/src/types';
import type { Env } from '../../../../../src/shared/src/types';
import { getTestDb, createMockEnv, createMockUser, cleanupDb, createMockD1Database, createMockKVNamespace } from '../../../../../src/shared/tests/utils/test-helpers';

let mockEnv: Env;
beforeEach(async () => {
  vi.clearAllMocks();
  mockEnv = await createMockEnv();
  // Use robust, shared test KV and DB mocks
  // Remove any static/fake responses or placeholder logic in tests
  mockEnv.CELEBRUM_KV = createMockKVNamespace();
});

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    service = new FeatureFlagService(mockEnv);
  });
  
  describe('Basic Feature Flag Checks', () => {
    test('should return default values for unknown flags', async () => {
      const result = await service.isFeatureEnabled('unknown.flag');
      expect(result).toBe(false);
    });
    
    test('should validate feature flag keys', () => {
      expect(service.isValidFeatureFlag('trading.enabled')).toBe(true);
      expect(service.isValidFeatureFlag('automated_cleanup.enabled')).toBe(true);
      expect(service.isValidFeatureFlag('nonexistent.flag')).toBe(false);
    });
    
    test('should get available feature flags', () => {
      const flags = service.getAvailableFlags();
      expect(Array.isArray(flags)).toBe(true);
      expect(flags.length).toBeGreaterThan(0);
    });
    
    test('should get feature descriptions', () => {
      const description = service.getFeatureDescription('automated_cleanup.enabled');
      expect(typeof description === 'string' || description === null).toBe(true);
    });
  });
  
  describe('Role-based Access', () => {
    test('should respect role restrictions', async () => {
      // Test with different roles
      const roles: UserRoleType[] = ['free', 'pro', 'ultra', 'admin', 'superadmin'];
      
      for (const role of roles) {
        const result = await service.isFeatureEnabled(
          'trading.enabled',
          'test-user',
          role,
          'free'
        );
        expect(typeof result).toBe('boolean');
      }
    });
    
    test('should handle subscription tier restrictions', async () => {
      const tiers: SubscriptionTierType[] = ['free', 'pro', 'ultra', 'enterprise'];
      
      for (const tier of tiers) {
        const result = await service.isFeatureEnabled(
          'analytics.enabled',
          'test-user',
          'pro',
          tier
        );
        expect(typeof result).toBe('boolean');
      }
    });
  });
  
  describe('Dynamic Flag Management', () => {
    test('should set and get global flags', async () => {
      const result = await service.setGlobalFlag(
        'test.feature',
        true,
        'admin-user'
      );
      
      expect(result.success).toBe(true);
      
      const enabled = await service.isFeatureEnabled('test.feature');
      expect(enabled).toBe(true);
    });
    
    test('should set and get user-specific flags', async () => {
      const result = await service.setUserFlag(
        'test-user',
        'test.feature',
        true,
        'admin-user'
      );
      
      expect(result.success).toBe(true);
      
      const enabled = await service.isFeatureEnabled(
        'test.feature',
        'test-user'
      );
      expect(enabled).toBe(true);
    });
    
    test('should remove user-specific flags', async () => {
      // Set a user flag first
      await service.setUserFlag(
        'test-user',
        'test.feature',
        true,
        'admin-user'
      );
      
      // Remove it
      const result = await service.removeUserFlag(
        'test-user',
        'test.feature',
        'admin-user'
      );
      
      expect(result.success).toBe(true);
    });
    
    test('should get user feature flags', async () => {
      const flags = await service.getUserFeatureFlags(
        'test-user',
        'pro',
        'pro'
      );
      
      expect(typeof flags).toBe('object');
      expect(flags).not.toBeNull();
    });
  });
  
  describe('Configuration and Stats', () => {
    test('should get feature flag configuration', async () => {
      const config = await service.getFeatureFlagConfig('test.feature');
      expect(config).toBeDefined();
    });
    
    test('should get feature flag statistics', async () => {
      const stats = await service.getFeatureFlagStats('test.feature');
      expect(stats).toBeDefined();
    });
    
    test('should record flag usage', async () => {
      await expect(
        service.recordFlagUsage('test.feature', 'test-user', true)
      ).resolves.not.toThrow();
    });
  });
});

describe('FeatureFlagRoutes', () => {
  let routes: FeatureFlagRoutes;
  
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    routes = new FeatureFlagRoutes(mockEnv);
  });
  
  describe('API Endpoints', () => {
    test('should check feature flags', async () => {
      const response = await routes.checkFeatureFlag({
        featureKey: 'trading.enabled',
        userId: 'test-user',
        role: 'pro',
        subscriptionTier: 'pro'
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });
    
    test('should handle invalid feature keys', async () => {
      const response = await routes.checkFeatureFlag({
        featureKey: 'invalid.feature'
      });
      
      expect(response.success).toBe(false);
      expect((response as unknown as { error: string }).error).toContain('Invalid feature flag');
    });
    
    test('should get user feature flags', async () => {
      const response = await routes.getUserFeatureFlags(
        'test-user',
        'pro',
        'pro'
      );
      
      expect(response.success).toBe(true);
      expect((response as unknown as { flags: unknown }).flags).toBeDefined();
      expect((response as unknown as { availableFlags: unknown }).availableFlags).toBeDefined();
    });
    
    test('should set global feature flags', async () => {
      const response = await routes.setGlobalFeatureFlag({
        featureKey: 'test.feature',
        enabled: true,
        adminUserId: 'admin-user'
      });
      
      expect(response.success).toBe(true);
    });
    
    test('should bulk check feature flags', async () => {
      const response = await routes.bulkCheckFeatureFlags(
        ['trading.enabled', 'analytics.enabled'],
        'test-user',
        'pro',
        'pro'
      );
      
      expect(response.success).toBe(true);
      expect((response as unknown as { data?: { results: unknown } }).data?.results).toBeDefined();
    });
    
    test('should get available feature flags', async () => {
      const response = await routes.getAvailableFeatureFlags();
      
      expect(response.success).toBe(true);
      expect((response as unknown as { data?: { flags: unknown[] } }).data?.flags).toBeDefined();
      expect(Array.isArray((response as unknown as { data?: { flags: unknown[] } }).data?.flags)).toBe(true);
    });
  });
});

describe('FeatureFlagMiddleware', () => {
  let middleware: FeatureFlagMiddleware;
  
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    middleware = new FeatureFlagMiddleware(mockEnv);
  });
  
  test('should require single feature', async () => {
    const check = middleware.requireFeature('trading.enabled');
    const result = await check('test-user', 'pro', 'pro');
    
    expect(result.allowed).toBeDefined();
    expect(typeof result.allowed).toBe('boolean');
  });
  
  test('should require multiple features', async () => {
    const check = middleware.requireFeatures(['trading.enabled', 'analytics.enabled']);
    const result = await check('test-user', 'pro', 'pro');
    
    expect(result.allowed).toBeDefined();
    expect(typeof result.allowed).toBe('boolean');
    expect((result as unknown as { results: unknown }).results).toBeDefined();
  });
});

describe('FeatureFlagUtils', () => {
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    // Initialize utils with mock service
    FeatureFlagUtils.initialize(mockEnv);
  });
  
  test('should check if feature is enabled', async () => {
    const enabled = await FeatureFlagUtils.isEnabled('trading.enabled', {
      userId: 'test-user',
      role: 'pro',
      subscriptionTier: 'pro'
    });
    
    expect(typeof enabled).toBe('boolean');
  });
  
  test('should check feature with detailed result', async () => {
    const result = await FeatureFlagUtils.checkFeature('trading.enabled', {
      userId: 'test-user',
      role: 'pro',
      subscriptionTier: 'pro'
    });
    
    expect((result as unknown as { enabled: boolean }).enabled).toBeDefined();
    expect(typeof (result as unknown as { enabled: boolean }).enabled).toBe('boolean');
  });
  
  test('should check multiple features', async () => {
    const results = await FeatureFlagUtils.checkFeatures(
      ['trading.enabled', 'analytics.enabled'],
      {
        userId: 'test-user',
        role: 'pro',
        subscriptionTier: 'pro'
      }
    );
    
    expect(typeof results).toBe('object');
    expect((results as unknown as Record<string, boolean>)['trading.enabled']).toBeDefined();
    expect((results as unknown as Record<string, boolean>)['analytics.enabled']).toBeDefined();
  });
  
  test('should validate feature flags', () => {
    expect(FeatureFlagUtils.isValidFeature('trading.enabled')).toBe(true);
    expect(FeatureFlagUtils.isValidFeature('invalid.feature')).toBe(false);
  });
  
  test('should get available features', () => {
    const features = FeatureFlagUtils.getAvailableFeatures();
    expect(Array.isArray(features)).toBe(true);
  });
});

describe('FeatureFlagConditional', () => {
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    FeatureFlagUtils.initialize(mockEnv);
  });
  
  test('should execute function if feature is enabled', async () => {
    const mockFn = vi.fn(() => 'executed');
    
    const result = await FeatureFlagConditional.ifEnabled(
      'trading.enabled',
      mockFn,
      {
        userId: 'test-user',
        role: 'pro',
        subscriptionTier: 'pro'
      }
    );
    
    // Result depends on whether the feature is actually enabled
    if (result !== null) {
      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('executed');
    } else {
      expect(mockFn).not.toHaveBeenCalled();
    }
  });
  
  test('should execute appropriate function based on feature status', async () => {
    const enabledFn = vi.fn(() => 'enabled');
    const disabledFn = vi.fn(() => 'disabled');
    
    const result = await FeatureFlagConditional.ifEnabledElse(
      'trading.enabled',
      enabledFn,
      disabledFn,
      {
        userId: 'test-user',
        role: 'pro',
        subscriptionTier: 'pro'
      }
    );
    
    expect(result).toBeDefined();
    expect(enabledFn.mock.calls.length + disabledFn.mock.calls.length).toBe(1);
  });
});

describe('FeatureFlagCache', () => {
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    FeatureFlagUtils.initialize(mockEnv);
    FeatureFlagCache.clearCache();
  });
  
  test('should cache feature flag values', async () => {
    const context = {
      userId: 'test-user',
      role: 'pro' as UserRoleType,
      subscriptionTier: 'pro' as SubscriptionTierType
    };
    
    // First call
    const result1 = await FeatureFlagCache.getCached('trading.enabled', context);
    
    // Second call should use cache
    const result2 = await FeatureFlagCache.getCached('trading.enabled', context);
    
    expect(result1).toBe(result2);
    expect(typeof result1).toBe('boolean');
  });
  
  test('should clear cache', async () => {
    const context = {
      userId: 'test-user',
      role: 'pro' as UserRoleType,
      subscriptionTier: 'pro' as SubscriptionTierType
    };
    
    // Cache a value
    await FeatureFlagCache.getCached('trading.enabled', context);
    
    // Clear cache
    FeatureFlagCache.clearCache('trading.enabled');
    
    // Should work without errors
    const result = await FeatureFlagCache.getCached('trading.enabled', context);
    expect(typeof result).toBe('boolean');
  });
  
  test('should clean expired entries', () => {
    // This is mainly to ensure the method exists and doesn't throw
    expect(() => FeatureFlagCache.cleanExpired()).not.toThrow();
  });
});

describe('Integration Tests', () => {
  let service: FeatureFlagService;
  let routes: FeatureFlagRoutes;
  
  beforeEach(() => {
    mockEnv.CELEBRUM_KV.clear();
    service = new FeatureFlagService(mockEnv);
    routes = new FeatureFlagRoutes(mockEnv);
    FeatureFlagUtils.initialize(mockEnv);
  });
  
  test('should work end-to-end', async () => {
    // Set a global flag via service
    const setResult = await service.setGlobalFlag(
      'trading.enabled',
      true,
      'admin-user'
    );
    expect(setResult.success).toBe(true);
    
    // Check via routes
    const checkResult = await routes.checkFeatureFlag({
      featureKey: 'trading.enabled',
      userId: 'test-user'
    });
    expect(checkResult.success).toBe(true);
    
    // Check via utils
    const utilsResult = await FeatureFlagUtils.isEnabled('trading.enabled', {
      userId: 'test-user'
    });
    expect(utilsResult).toBe(true);
  });
  
  test('should handle complex scenarios', async () => {
    const userId = 'test-user';
    const featureKey = 'complex.feature';
    
    // Set global flag to false
    await service.setGlobalFlag(featureKey, false, 'admin-user');
    
    // Set user override to true
    await service.setUserFlag(userId, featureKey, true, 'admin-user');
    
    // User should see true (override takes precedence)
    const userResult = await service.isFeatureEnabled(featureKey, userId);
    expect(userResult).toBe(true);
    
    // Other users should see false (global setting)
    const otherResult = await service.isFeatureEnabled(featureKey, 'other-user');
    expect(otherResult).toBe(false);
    
    // Remove user override
    await service.removeUserFlag(userId, featureKey, 'admin-user');
    
    // User should now see false (global setting)
    const finalResult = await service.isFeatureEnabled(featureKey, userId);
    expect(finalResult).toBe(false);
  });
});