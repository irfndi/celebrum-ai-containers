/**
 * Unit tests for Telegram Bot Start Command Handler
 * Tests the implementation of the /start command with various scenarios
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleStartCommand } from '../../../src/telegram-bot/src/handlers/start-command';
import { FeatureFlagService, createFeatureFlagService } from '../../../src/shared/src/services/feature-flag-service';
import { UserQueries, InvitationQueries } from '../../../src/db/src/index';
import { getTestDb, createMockEnv, createMockUser, createMockContext } from '../../../src/shared/tests/utils/test-helpers';
import { TelegramUpdate } from '../../../src/telegram-bot/src/types';
import type { Env } from '../../../src/shared/src/types';

// Mock the createFeatureFlagService function
vi.mock('../../../src/shared/src/services/feature-flag-service', async () => {
  const actual = await vi.importActual('../../../src/shared/src/services/feature-flag-service');
  return {
    ...actual,
    createFeatureFlagService: vi.fn(),
  };
});

// Mock the Telegram Bot API
const mockSendMessage = vi.fn();
const mockAnswerCallbackQuery = vi.fn();


// Mock the fetch API for Telegram Bot API calls
global.fetch = vi.fn().mockImplementation(async (url, options) => {
  if (url.includes('sendMessage')) {
    mockSendMessage(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }));
  }
  if (url.includes('answerCallbackQuery')) {
    mockAnswerCallbackQuery(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true }));
  }
  return new Response(JSON.stringify({ ok: false, error_code: 404, description: 'Not Found' }));
});

describe('Telegram Bot Start Command', () => {
  let mockEnv: Env;
  let mockContext: Awaited<ReturnType<typeof createMockContext>>;
  let featureFlagService: FeatureFlagService;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create mock environment and context
    mockEnv = await createMockEnv();
    mockContext = await createMockContext();
    
    // Initialize services
    featureFlagService = new FeatureFlagService(mockEnv);
    
    // Mock createFeatureFlagService to return our test instance
    vi.mocked(createFeatureFlagService).mockReturnValue(featureFlagService);
    
    // Mock UserQueries methods to avoid database complexity
    vi.spyOn(UserQueries.prototype, 'create').mockImplementation(async (userData) => {
      return {
        id: `user_${userData.telegramId}`,
        telegramId: userData.telegramId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        role: userData.role || 'free',
        status: userData.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: userData.lastActiveAt || new Date(),
        settings: userData.settings || {},
        apiLimits: userData.apiLimits || {},
        tradingPreferences: userData.tradingPreferences || {},
        languageCode: (userData.settings as any)?.language || 'en',
        email: null,
        accountBalance: '0.00',
        betaExpiresAt: null
      };
    });

    vi.spyOn(UserQueries.prototype, 'findByTelegramId').mockImplementation(async (telegramId) => {
      // Return null by default (no existing user)
      return null;
    });

    // Mock InvitationQueries methods
    vi.spyOn(InvitationQueries.prototype, 'findByCode').mockImplementation(async (code) => {
      if (code === 'valid_invitation_code') {
        return {
          id: 'inv_123',
          code: code,
          isActive: true,
          expiresAt: null,
          maxUses: null,
          currentUses: 0,
          createdBy: 'admin',
          createdAt: new Date(),
          purpose: 'test'
        };
      }
      return null;
    });

    vi.spyOn(InvitationQueries.prototype, 'incrementUsage').mockImplementation(async (code: string) => {
      return {
        code: code,
        createdAt: new Date(),
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: 'admin',
        maxUses: 100,
        currentUses: 1,
        purpose: 'test'
      };
    });
    
    // Clear any existing data
    await mockEnv.CELEBRUM_KV.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('New User Flow', () => {
    test('should create new user and ask for invitation code when invitation is required', async () => {
      // Enable invitation requirement
      await featureFlagService.setGlobalFlag('registration.invitation_required', true, 'test-admin');
      
      const mockTelegramUser = {
        id: 987654321,
        first_name: 'New',
        last_name: 'User',
        username: 'newuser',
        language_code: 'en',
        is_bot: false
      };

      const update: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: mockTelegramUser,
          chat: { id: mockTelegramUser.id, type: 'private' as const, first_name: 'New', last_name: 'User' },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      };

      const response = await handleStartCommand(update, mockContext);

      // Verify response is returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(mockTelegramUser.id);
      
      // Verify the response asks for invitation code
      expect(response?.text).toContain('invitation code');
    });

    test('should create new user and welcome without invitation when invitation is not required', async () => {
      // Disable invitation requirement
      await featureFlagService.setGlobalFlag('registration.invitation_required', false, 'test-admin');
      
      const mockTelegramUser = {
        id: 987654322,
        first_name: 'New',
        last_name: 'User',
        username: 'newuser2',
        language_code: 'en',
        is_bot: false
      };

      const update: TelegramUpdate = {
        update_id: 2,
        message: {
          message_id: 1,
          from: mockTelegramUser,
          chat: { id: mockTelegramUser.id, type: 'private' as const, first_name: 'New', last_name: 'User' },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      };

      const response = await handleStartCommand(update, mockContext);

      // Verify response is returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(mockTelegramUser.id);
      
      // Verify the response welcomes the user
      expect(response?.text).toContain('Welcome');
      expect(response?.text).toContain('successfully created');
    });
  });

  describe('Existing User Flow with Bypass Functionality', () => {
    test('should welcome back existing user when bypass is enabled', async () => {
      // Enable bypass for existing users
      await featureFlagService.setGlobalFlag('registration.bypass_for_existing', true, 'test-admin');
      await featureFlagService.setGlobalFlag('registration.invitation_required', true, 'test-admin');
      
      const mockTelegramUser = {
        id: 123456789,
        first_name: 'Existing',
        last_name: 'User',
        username: 'existinguser',
        language_code: 'en',
        is_bot: false
      };

      // Mock existing user
      const existingUser = {
        id: `user_${mockTelegramUser.id}`,
        telegramId: mockTelegramUser.id.toString(),
        firstName: mockTelegramUser.first_name,
        lastName: mockTelegramUser.last_name,
        username: mockTelegramUser.username,
        role: 'free' as const,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        settings: {
          notifications: true,
          theme: 'light',
          language: mockTelegramUser.language_code || 'en'
        },
        apiLimits: {
          exchangeApis: 2,
          aiApis: 10,
          maxDailyRequests: 100
        },
        tradingPreferences: {
          percentagePerTrade: 5,
          maxConcurrentTrades: 3,
          riskTolerance: 'medium',
          autoTrade: false
        },
        languageCode: 'en',
        email: null,
        accountBalance: '0.00',
        betaExpiresAt: null
      };

      // Mock findByTelegramId to return the existing user
      vi.mocked(UserQueries.prototype.findByTelegramId).mockResolvedValueOnce(existingUser);

      const update: TelegramUpdate = {
        update_id: 3,
        message: {
          message_id: 1,
          from: mockTelegramUser,
          chat: { id: mockTelegramUser.id, type: 'private' as const, first_name: 'Existing', last_name: 'User' },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      };

      const response = await handleStartCommand(update, mockContext);

      // Verify response is returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(mockTelegramUser.id);
      
      // Verify the response welcomes the user back
      expect(response?.text).toContain('Welcome back');
      expect(response?.text).toContain('active and ready');
    });

    test('should ask for invitation code from existing user when bypass is disabled', async () => {
      // Disable bypass for existing users
      await featureFlagService.setGlobalFlag('registration.bypass_for_existing', false, 'test-admin');
      await featureFlagService.setGlobalFlag('registration.invitation_required', true, 'test-admin');
      
      const mockTelegramUser = {
        id: 123456790,
        first_name: 'Existing',
        last_name: 'User2',
        username: 'existinguser2',
        language_code: 'en',
        is_bot: false
      };

      // Mock existing user
      const existingUser = {
        id: `user_${mockTelegramUser.id}`,
        telegramId: mockTelegramUser.id.toString(),
        firstName: mockTelegramUser.first_name,
        lastName: mockTelegramUser.last_name,
        username: mockTelegramUser.username,
        role: 'free' as const,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        settings: {
          notifications: true,
          theme: 'light',
          language: mockTelegramUser.language_code || 'en'
        },
        apiLimits: {
          exchangeApis: 2,
          aiApis: 10,
          maxDailyRequests: 100
        },
        tradingPreferences: {
          percentagePerTrade: 5,
          maxConcurrentTrades: 3,
          riskTolerance: 'medium',
          autoTrade: false
        },
        languageCode: 'en',
        email: null,
        accountBalance: '0.00',
        betaExpiresAt: null
      };

      // Mock findByTelegramId to return the existing user
      vi.mocked(UserQueries.prototype.findByTelegramId).mockResolvedValueOnce(existingUser);

      const update: TelegramUpdate = {
        update_id: 4,
        message: {
          message_id: 1,
          from: mockTelegramUser,
          chat: { id: mockTelegramUser.id, type: 'private' as const, first_name: 'Existing', last_name: 'User2' },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      };

      const response = await handleStartCommand(update, mockContext);

      // Verify response is returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(mockTelegramUser.id);
      
      // Verify the response asks for invitation code
      expect(response?.text).toContain('invitation code');
    });

    test('should welcome back existing user with valid invitation code when bypass is disabled', async () => {
      // Disable bypass for existing users
      await featureFlagService.setGlobalFlag('registration.bypass_for_existing', false, 'test-admin');
      await featureFlagService.setGlobalFlag('registration.invitation_required', true, 'test-admin');
      
      const mockTelegramUser = {
        id: 123456791,
        first_name: 'Existing',
        last_name: 'User3',
        username: 'existinguser3',
        language_code: 'en',
        is_bot: false
      };

      // Mock existing user
      const existingUser = {
        id: `user_${mockTelegramUser.id}`,
        telegramId: mockTelegramUser.id.toString(),
        firstName: mockTelegramUser.first_name,
        lastName: mockTelegramUser.last_name,
        username: mockTelegramUser.username,
        role: 'free' as const,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        settings: {
          notifications: true,
          theme: 'light',
          language: mockTelegramUser.language_code || 'en'
        },
        apiLimits: {
          exchangeApis: 2,
          aiApis: 10,
          maxDailyRequests: 100
        },
        tradingPreferences: {
          percentagePerTrade: 5,
          maxConcurrentTrades: 3,
          riskTolerance: 'medium',
          autoTrade: false
        },
        languageCode: 'en',
        email: null,
        accountBalance: '0.00',
        betaExpiresAt: null
      };

      // Mock findByTelegramId to return the existing user
      vi.mocked(UserQueries.prototype.findByTelegramId).mockResolvedValueOnce(existingUser);

      const update: TelegramUpdate = {
        update_id: 5,
        message: {
          message_id: 1,
          from: mockTelegramUser,
          chat: { id: mockTelegramUser.id, type: 'private' as const, first_name: 'Existing', last_name: 'User3' },
          date: Math.floor(Date.now() / 1000),
          text: '/start valid_invitation_code'
        }
      };

      const response = await handleStartCommand(update, mockContext);

      // Verify response is returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(mockTelegramUser.id);
      
      // Verify the response welcomes the user back
      expect(response?.text).toContain('Welcome back');
    });
  });

  describe('Feature Flag Configuration', () => {
    test('should correctly read feature flag configuration', async () => {
      // Check the current feature flag configuration
      const invitationRequired = await featureFlagService.isFeatureEnabled('registration.invitation_required');
      const bypassForExisting = await featureFlagService.isFeatureEnabled('registration.bypass_for_existing');
      
      // These should match the configuration in feature_flags.json
      expect(invitationRequired).toBe(true);
      expect(bypassForExisting).toBe(true);
    });
  });
});