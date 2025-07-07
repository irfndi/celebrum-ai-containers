/**
 * Unit tests for the /start command handler
 * Refactored to use real services and a test database.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ===== MOCK SETUP - MUST BE FIRST =====
// Create a shared mock state for feature flags
const mockFeatureFlags = {
  INVITE_SYSTEM_ACTIVE: true,
  REGISTRATION_BYPASS_FOR_EXISTING: false,
};

// Mock the createDb function to return our mock database
vi.mock('../../../db/src/utils/connection', () => ({
  createDb: vi.fn(),
  getDatabase: vi.fn(),
  withTransaction: vi.fn()
}));

// ===== END MOCKS =====

// Now import everything after mocks are set up
import { processTelegramUpdate, initializeHandlers } from '../../src/handlers/index';
import type { TelegramUpdate, TelegramWebhookContext, BotResponse } from '../../src/types/index';
import type { Env } from '../../../shared/src/types/index';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { getTestDb, cleanupDb, createMockEnv } from '../../../shared/tests/utils/test-helpers.ts';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../../db/src/schema';
import { users } from '../../../db/src/schema/users';
import { invitationCodes } from '../../../db/src/schema/invitations';
import { createDb } from '../../../db/src/utils/connection';
import { createFeatureFlagService, getFeatureFlagService, resetFeatureFlagService } from '../../../shared/src/services/feature-flag-service.js';

// Helper to update feature flags in KV store during tests
async function updateFeatureFlags(kv: KVNamespace, flags: typeof mockFeatureFlags) {
  console.log('Updating feature flags in KV store:', flags); // Debug
  
  // Update invitation required flag
  await kv.put('rbac:global_flag:registration.invitation_required', JSON.stringify({
    enabled: flags.INVITE_SYSTEM_ACTIVE,
    updatedBy: 'test',
    updatedAt: Date.now(),
    version: 1
  }));
  
  // Update bypass for existing flag  
  await kv.put('rbac:global_flag:registration.bypass_for_existing', JSON.stringify({
    enabled: flags.REGISTRATION_BYPASS_FOR_EXISTING,
    updatedBy: 'test',
    updatedAt: Date.now(),
    version: 1
  }));
}

// Helper to create a consistent Telegram update object for tests
function createTestUpdate(text: string, userId = 12345, username = 'testuser'): TelegramUpdate {
  return {
    update_id: Date.now() + Math.random(),
    message: {
      message_id: Date.now() + Math.random(),
      date: Math.floor(Date.now() / 1000),
      text,
      from: {
        id: userId,
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: username,
        language_code: 'en'
      },
      chat: {
        id: userId,
        first_name: 'Test',
        last_name: 'User',
        username: username,
        type: 'private'
      }
    }
  };
}

describe('/start Command Handler', () => {
  let db: DrizzleD1Database<typeof schema>;
  let kv: KVNamespace;
  let dispose: () => Promise<void>;
  let testContext: TelegramWebhookContext;
  let mockEnv: any;

  beforeEach(async () => {
    // Clear and reset all mocks to ensure fresh state
    vi.clearAllMocks();
    
    const testDbContext = await getTestDb();
    db = testDbContext.db;
    kv = testDbContext.kv;
    dispose = testDbContext.dispose;

    await cleanupDb(db);

    // Create proper mock environment with all required properties
    mockEnv = createMockEnv();
    
    // Update mock environment to use the test database and KV
    mockEnv.DB = (db as any)?.client || db;
    mockEnv.SESSIONS = kv;
    mockEnv.CELEBRUM_KV = kv;
    
    // Set up feature flags in the KV store for the FeatureFlagManager
    // These will override the default flags if needed
    if (mockFeatureFlags.INVITE_SYSTEM_ACTIVE === false) {
      // Override to disable invitation requirement
      await kv.put('rbac:global_flag:registration.invitation_required', JSON.stringify({
        enabled: false,
        updatedBy: 'test',
        updatedAt: Date.now(),
        version: 1
      }));
    }
    
    if (mockFeatureFlags.REGISTRATION_BYPASS_FOR_EXISTING === true) {
      // Override to enable bypass for existing users
      await kv.put('rbac:global_flag:registration.bypass_for_existing', JSON.stringify({
        enabled: true,
        updatedBy: 'test',
        updatedAt: Date.now(),
        version: 1
      }));
    }
    
    // Mock the createDb function to return our mock database
    vi.mocked(createDb).mockReturnValue(db);
    
    testContext = {
      env: mockEnv as unknown as Env,
      request: new Request('https://example.com'),
      waitUntil: vi.fn()
    };

    // Reset feature flags to defaults for each test
    mockFeatureFlags.INVITE_SYSTEM_ACTIVE = true;
    mockFeatureFlags.REGISTRATION_BYPASS_FOR_EXISTING = false;

    // Initialize handlers to ensure services are created with the test context
    initializeHandlers();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await dispose();
  });

  test('should welcome existing user without invitation code', async () => {
    const telegramId = '12345';
    await db.insert(users).values({
      telegramId: telegramId,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser'
    });

    const update = createTestUpdate('/start', parseInt(telegramId, 10));
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;

    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Welcome back');
    expect(response.text).toContain('Test');
    expect(response.text).toContain('Session ID:');
  });

  test('should require invitation code for new user', async () => {
    const update = createTestUpdate('/start');
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;

    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Invitation Required');
    expect(response.text).toContain('/start YOUR_INVITATION_CODE');
    expect(response.text).toContain('private beta');
  });

  test('should register new user with valid invitation code', async () => {
    await db.insert(invitationCodes).values({
        code: 'VALIDCODE',
        createdBy: 'admin',
        maxUses: 1,
        currentUses: 0,
        isActive: true,
    });

    const update = createTestUpdate('/start VALIDCODE', 54321, 'newuser');
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;
    
    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Welcome to Celebrum Trading Platform');
    expect(response.text).toContain('Your account has been created');
    expect(response.text).toContain('Session ID:');

    const dbUser = await db.query.users.findFirst({ where: (u, {eq}) => eq(u.telegramId, '54321')});
    expect(dbUser).toBeDefined();
    expect(dbUser?.username).toBe('newuser');
  });

  test('should reject invalid invitation code', async () => {
    const update = createTestUpdate('/start INVALIDCODE');
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;

    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Invalid Invitation Code');
    expect(response.text).toContain('invalid, expired, or has reached its maximum usage');
    expect(response.text).toContain('/start YOUR_INVITATION_CODE');
  });

  test('should reject expired invitation code', async () => {
    await db.insert(invitationCodes).values({
        code: 'EXPIREDCODE',
        createdBy: 'admin',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        currentUses: 0,
        isActive: true,
    });
    
    const update = createTestUpdate('/start EXPIREDCODE');
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;

    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Invalid Invitation Code');
  });

  test('should reject invitation code at maximum usage', async () => {
    await db.insert(invitationCodes).values({
        code: 'USEDCODE',
        createdBy: 'admin',
        maxUses: 1,
        currentUses: 1,
        isActive: true,
    });
    
    const update = createTestUpdate('/start USEDCODE');
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;
    
    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Invalid Invitation Code');
  });

  test('should handle missing user data gracefully', async () => {
    const update = createTestUpdate('/start');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    delete update.message!.from;
    const response = (await processTelegramUpdate(update, testContext)) as BotResponse;

    expect(response).toBeTruthy();
    expect(response.method).toBe('sendMessage');
    expect(response.text).toContain('Could not identify you from the message');
  });

  describe('Feature Flag Tests', () => {
    beforeEach(async () => {
      // Reset the FeatureFlagService singleton before each test
      resetFeatureFlagService();
      // Clear any existing flags from KV
      await kv.delete('rbac:global_flag:registration.invitation_required');
    });
    
    test('should NOT require invitation when feature flag is disabled', async () => {
      // Set the flag to false in KV store directly
      await kv.put('rbac:global_flag:registration.invitation_required', JSON.stringify({
        enabled: false,
        updatedBy: 'test',
        updatedAt: Date.now(),
        version: 1
      }));
      
      // Initialize the FeatureFlagService singleton with testContext.env after setting the flag
      const featureFlagService = createFeatureFlagService(testContext.env);
      
      // Clear the cache to ensure fresh read from KV
      featureFlagService.clearCache();
      
      // Verify the flag is actually set in KV
      const kvValue = await kv.get('rbac:global_flag:registration.invitation_required', 'json');
      console.log('KV value after setting:', kvValue);
      
      // Verify the feature flag service reads it correctly
      const flagValue = await featureFlagService.isFeatureEnabled('registration.invitation_required');
      console.log('FeatureFlagService reads flag as:', flagValue);
      
      const update = createTestUpdate('/start', 11111, 'noflaguser');
      const response = await processTelegramUpdate(update, testContext) as BotResponse;

      expect(response).toBeTruthy();
      expect(response.method).toBe('sendMessage');
      expect(response.text).toContain('Welcome to Celebrum Trading Platform'); // Registers successfully
    });

    test('should require invitation when feature flag is enabled (default behavior)', async () => {
      // Don't set any flag in KV - should use default value (true)
      
      // Initialize the FeatureFlagService singleton with testContext.env
      const featureFlagService = createFeatureFlagService(testContext.env);
      
      // Clear the cache to ensure fresh read
      featureFlagService.clearCache();
      
      // Verify the flag uses default value
      const flagValue = await featureFlagService.isFeatureEnabled('registration.invitation_required');
      console.log('FeatureFlagService reads default flag as:', flagValue);
      
      const update = createTestUpdate('/start', 22222, 'flaguser');
      const response = await processTelegramUpdate(update, testContext) as BotResponse;
      
      expect(response).toBeTruthy();
      expect(response.method).toBe('sendMessage');
      expect(response.text).toContain('Invitation Required');
    });
  });

  describe('Superadmin Role Tests', () => {
    beforeEach(async () => {
      // Create a superadmin user for these tests
      await db.insert(users).values({
        telegramId: '987654321',
        firstName: 'Super',
        username: 'superadmin',
        role: 'superadmin',
      });
    });

    test('should allow superadmin to access admin commands', async () => {
      const helpUpdate = createTestUpdate('/help', 987654321, 'superadmin');
      const response = await processTelegramUpdate(helpUpdate, testContext) as BotResponse;

      expect(response).toBeTruthy();
      expect(response.text).toContain('👑 Admin Commands');
      expect(response.text).toContain('/createinvites');
    });

    test('should allow existing superadmin to use /start without invitation code', async () => {
      const startUpdate = createTestUpdate('/start', 987654321, 'superadmin');
      const response = await processTelegramUpdate(startUpdate, testContext) as BotResponse;
      
      expect(response).toBeTruthy();
      expect(response.method).toBe('sendMessage');
      expect(response.text).toContain('Welcome back');
      expect(response.text).toContain('Super');
      expect(response.text).toContain('Session ID:');
    });
  });
});