import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { TelegramUpdate, TelegramWebhookContext } from '@celebrum-ai/telegram-bot/types';
import type { Env } from '@celebrum-ai/shared';
import type { D1Database } from '@cloudflare/workers-types';

// Mock the modules at the top level
vi.mock('@celebrum-ai/db', () => ({
  UserQueries: vi.fn(),
  InvitationQueries: vi.fn(),
}));

vi.mock('@celebrum-ai/shared/services/feature-flag-service', () => ({
  createFeatureFlagService: vi.fn(),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn().mockReturnValue({}),
}));

let mockEnv: Env;
let mockContext: TelegramWebhookContext;
let mockUserQueries: any;
let mockInvitationQueries: any;
let mockFeatureFlagService: any;

// Helper function to create mock user
function createMockUser() {
  return {
    id: 'user-123',
    telegramId: '123456789',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'free' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to create mock invitation
function createMockInvitation() {
  return {
    id: 'inv-123',
    code: 'TEST123',
    maxUses: 10,
    currentUses: 0,
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper to create mock env
async function createMockEnv(): Promise<Env> {
  return {
    DB: {} as D1Database,
    CELEBRUM_KV: {},
    PROD_BOT_MARKET_CACHE: {},
    PROD_BOT_SESSION_STORE: {},
    JWT_SECRET: 'test-secret',
    OPENAI_API_KEY: 'test-openai-key',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    ADMIN_USER_ID: 'admin-123',
    ENVIRONMENT: 'test',
    LOG_LEVEL: 'debug',
    RATE_LIMIT_REQUESTS_PER_MINUTE: '100',
    CACHE_TTL_SECONDS: '300',
    SUPER_ADMIN_USER_ID: 'admin-123',
    EXCHANGES: 'binance,bybit',
    ARBITRAGE_THRESHOLD: '0.5',
    TELEGRAM_CHAT_ID: '123456789',
    TELEGRAM_TEST_MODE: 'true',
  } as any;
}

describe('Start Command Handler', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockEnv = await createMockEnv();
    mockContext = {
      env: mockEnv,
      request: new Request('https://example.com'),
      waitUntil: vi.fn(),
    };

    // Create fresh mock instances
    mockUserQueries = {
      findByTelegramId: vi.fn(),
      create: vi.fn(),
    };
    
    mockInvitationQueries = {
      findByCode: vi.fn(),
      incrementUsage: vi.fn(),
    };
    
    mockFeatureFlagService = {
      isFeatureEnabled: vi.fn(),
    };

    // Setup the mocks to return our instances
    const { UserQueries, InvitationQueries } = await import('@celebrum-ai/db');
    const { createFeatureFlagService } = await import('@celebrum-ai/shared/services/feature-flag-service');
    
    UserQueries.mockImplementation(() => mockUserQueries);
    InvitationQueries.mockImplementation(() => mockInvitationQueries);
    createFeatureFlagService.mockReturnValue(mockFeatureFlagService);
    
    // Reset all mocks to ensure clean state
    vi.resetModules();
  });

  describe('New User Registration', () => {
    test('should allow registration without invitation when feature flag is off', async () => {
      const mockUpdate: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            is_bot: false,
            language_code: 'en',
          },
          chat: {
            id: 123456789,
            type: 'private' as const,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      };

      mockUserQueries.findByTelegramId.mockResolvedValue(null);
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(false);
      mockUserQueries.create.mockResolvedValue(createMockUser());

      const { handleStartCommand } = await import('@celebrum-ai/telegram-bot/handlers/start-command');
      const result = await handleStartCommand(mockUpdate, mockContext);

      expect(result).toBeDefined();
      expect(result?.text).toContain('Welcome to Celebrum AI');
      expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(mockFeatureFlagService.isFeatureEnabled).toHaveBeenCalledWith('registration.invitation_required');
      expect(mockUserQueries.create).toHaveBeenCalledWith(expect.objectContaining({
        telegramId: '123456789',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'free',
      }));
    });

    test('should require invitation when feature flag is on', async () => {
      const mockUpdate: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            is_bot: false,
            language_code: 'en',
          },
          chat: {
            id: 123456789,
            type: 'private' as const,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      };

      mockUserQueries.findByTelegramId.mockResolvedValue(null);
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(true);
      mockInvitationQueries.findByCode.mockResolvedValue(null);

      const { handleStartCommand } = await import('@celebrum-ai/telegram-bot/handlers/start-command');
      const result = await handleStartCommand(mockUpdate, mockContext);

      expect(result).toBeDefined();
      expect(result?.text).toContain('Registration requires an invitation code');
      expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(mockFeatureFlagService.isFeatureEnabled).toHaveBeenCalledWith('registration.invitation_required');
      expect(mockUserQueries.create).not.toHaveBeenCalled();
    });

    test('should register with valid invitation code', async () => {
      const mockUpdate: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            is_bot: false,
            language_code: 'en',
          },
          chat: {
            id: 123456789,
            type: 'private' as const,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start TEST123',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      };

      const mockInvitation = createMockInvitation();

      mockUserQueries.findByTelegramId.mockResolvedValue(null);
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(true);
      mockInvitationQueries.findByCode.mockResolvedValue(mockInvitation);
      mockUserQueries.create.mockResolvedValue(createMockUser());

      const { handleStartCommand } = await import('@celebrum-ai/telegram-bot/handlers/start-command');
      const result = await handleStartCommand(mockUpdate, mockContext);

      expect(result).toBeDefined();
      expect(result?.text).toContain('Welcome to Celebrum AI');
      expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(mockInvitationQueries.findByCode).toHaveBeenCalledWith('TEST123');
      expect(mockInvitationQueries.incrementUsage).toHaveBeenCalledWith('TEST123');
      expect(mockUserQueries.create).toHaveBeenCalledWith(expect.objectContaining({
        telegramId: '123456789',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'free',
      }));
    });

    test('should reject invalid invitation code', async () => {
      const mockUpdate: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            is_bot: false,
            language_code: 'en',
          },
          chat: {
            id: 123456789,
            type: 'private' as const,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start INVALID123',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      };

      mockUserQueries.findByTelegramId.mockResolvedValue(null);
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(true);
      mockInvitationQueries.findByCode.mockResolvedValue(null);

      const { handleStartCommand } = await import('@celebrum-ai/telegram-bot/handlers/start-command');
      const result = await handleStartCommand(mockUpdate, mockContext);

      expect(result).toBeDefined();
      expect(result?.text).toContain('Invalid invitation code');
      expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(mockInvitationQueries.findByCode).toHaveBeenCalledWith('INVALID123');
      expect(mockUserQueries.create).not.toHaveBeenCalled();
    });
  });

  describe('Existing User', () => {
    test('should welcome existing user', async () => {
      const mockUpdate: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            is_bot: false,
            language_code: 'en',
          },
          chat: {
            id: 123456789,
            type: 'private' as const,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      };

      const mockUser = createMockUser();

      mockUserQueries.findByTelegramId.mockResolvedValue(mockUser);
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(true);

      const { handleStartCommand } = await import('@celebrum-ai/telegram-bot/handlers/start-command');
      const result = await handleStartCommand(mockUpdate, mockContext);

      expect(result).toBeDefined();
      expect(result?.text).toContain('Welcome back');
      expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(mockUserQueries.create).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Input', () => {
    test('should return null for invalid update', async () => {
      const mockUpdate: TelegramUpdate = {
        update_id: 1,
      };

      // Import and test
      vi.resetModules();
      const { handleStartCommand } = await import('@celebrum-ai/telegram-bot/handlers/start-command');
      const result = await handleStartCommand(mockUpdate, mockContext);

      expect(result).toBeNull();
    });
  });
});