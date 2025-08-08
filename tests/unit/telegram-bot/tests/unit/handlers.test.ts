/**
 * Unit tests for Telegram bot handlers
 * Tests message handling, command processing, and user interactions
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import type { TelegramUpdate, TelegramBotResponse, TelegramMessage, TelegramUser, TelegramChat, TelegramWebhookContext } from '../../../../../src/telegram-bot/src/types';
import type { User } from '../../../../../src/shared/src/types';
import type { InvitationCode } from '../../../../../src/db/src/schema/invitations';
import type { Session } from '../../../../../src/shared/src/services/SessionService';
import type { Env } from '../../../../../src/shared/src/types';
import { initializeHandlers, processTelegramUpdate } from '../../../../../src/telegram-bot/src/handlers';
import { clearAllRateLimits } from '../../../../../src/telegram-bot/src/utils/index';
import { getTestDb, createMockEnv, createMockContext, createMockD1Database, createScenarioBasedTelegramApiMock, createMockUser } from '../../../../../src/shared/tests/utils/test-helpers';
import { UserService } from '../../../../../src/shared/src/services/UserService';

// Remove mockHandlers and mockTelegramResponse
// Use robust, scenario-based mocks for DB/KV/Telegram API via shared test-helpers
// Assert on real response content, not just that the handler was called

const originalFetch = global.fetch;

describe('Telegram Bot Handlers', () => {
  let mockEnv: Env;
  let mockContext: TelegramWebhookContext;

  beforeAll(() => {
    initializeHandlers();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllRateLimits();
    // Use a consistent telegramId for all tests
    const telegramId = '123456789';
    let mockUser = createMockUser({ telegramId });
    let invitations: InvitationCode[] = [];
    let sessions: Session[] = [];
    let featureFlags = {};

    const testName = expect.getState().currentTestName || '';

    if (testName.includes('existing users') || testName.includes('existing user')) {
      mockUser = createMockUser({ telegramId, username: 'janesmith', firstName: 'Jane' });
      sessions = [{ 
        id: 'session-1', 
        sessionId: 'session-1',
        userId: 'user-1',
        telegramId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true
      }];
      featureFlags = { bypassForExisting: true };
      // Mock UserService to return the existing user
      vi.spyOn(UserService.prototype, 'findUserByTelegramId').mockResolvedValue(mockUser as any);
    }
    if (testName.includes('settings')) {
      mockUser = createMockUser({ telegramId, role: 'pro', settings: { notifications: true } });
    }
    if (testName.includes('portfolio')) {
      mockUser = createMockUser({ telegramId, role: 'pro', portfolio: [{ symbol: 'BTC/USD', amount: 1.5 }] });
    }
    if (testName.includes('invalid trading commands')) {
      mockUser = undefined;
    }
    if (testName.includes('network errors')) {
      createScenarioBasedTelegramApiMock({ networkError: true });
    } else if (testName.includes('API rate limits')) {
      createScenarioBasedTelegramApiMock({ rateLimit: true });
    } else {
      createScenarioBasedTelegramApiMock();
    }
    // For new user /start, insert a valid invitation code and set invitation-required flag
    if (testName.includes('new users') || testName.includes('new user')) {
      invitations = [{ 
        code: 'VALIDCODE', 
        createdBy: 'admin', 
        maxUses: 1, 
        currentUses: 0, 
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        purpose: 'registration'
      }];
      featureFlags = { invitationRequired: true };
    }
    // For admin/superadmin
    if (testName.includes('superadmin') || testName.includes('admin')) {
      mockUser = createMockUser({ telegramId, role: 'superadmin', username: 'superadmin', firstName: 'Super' });
    }
    const { db, kv, dispose } = await getTestDb({ users: mockUser ? [mockUser] : [], invitations, sessions: [] });
    mockEnv = await createMockEnv();
    mockEnv.DB = db as any;
    mockEnv.CELEBRUM_KV = kv as any;
    mockContext = createMockContext() as unknown as TelegramWebhookContext;
    mockContext.env = mockEnv;
    // Set feature flags in KV
    if ((featureFlags as any).invitationRequired) {
      await kv.put('rbac:global_flag:registration.invitation_required', JSON.stringify({ enabled: true, updatedBy: 'test', updatedAt: Date.now(), version: 1 }));
    }
    if ((featureFlags as any).bypassForExisting) {
      await kv.put('rbac:global_flag:registration.bypass_for_existing', JSON.stringify({ enabled: true, updatedBy: 'test', updatedAt: Date.now(), version: 1 }));
    }
  });

  describe('Start Command Handler', () => {
    it('should handle /start command for new users', async () => {
      const startMessage: TelegramMessage = {
        message_id: 1,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe',
        },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/start',
      };

      const result = await processTelegramUpdate({ update_id: 1, message: startMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('Welcome to Celebrum Trading Platform');
    });

    it('should handle /start command for existing users', async () => {
      const startMessage: TelegramMessage = {
        message_id: 2,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'Jane',
          username: 'janesmith',
        },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/start',
      };

      const result = await processTelegramUpdate({ update_id: 2, message: startMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('Welcome back to Celebrum!');
    });
  });

  describe('Help Command Handler', () => {
    it('should provide help information', async () => {
      const helpMessage: TelegramMessage = {
        message_id: 3,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/help',
      };

      const result = await processTelegramUpdate({ update_id: 3, message: helpMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('🤖 <b>Celebrum Trading Bot Commands</b>');
      expect(result!.text).toContain('Here are the available commands:');
    });
  });

  describe('Settings Command Handler', () => {
    it('should show user settings', async () => {
      const settingsMessage: TelegramMessage = {
        message_id: 4,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/settings',
      };

      const result = await processTelegramUpdate({ update_id: 4, message: settingsMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('[DEMO MODE]\n\n⚙️ <b>Trading Settings</b>');
      expect(result!.text).toContain('This is a demo. Real settings management integration is pending.');
    });
  });

  describe('Trading Command Handler', () => {
    it('should handle trading-related commands', async () => {
      const tradingMessage: TelegramMessage = {
        message_id: 5,
        from: { id: 123456789, is_bot: false, first_name: 'Trader' },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/portfolio',
      };

      const result = await processTelegramUpdate({ update_id: 5, message: tradingMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('[DEMO MODE]\n\n📊 <b>Your Portfolio</b>');
      expect(result!.text).toContain('This is a demo. Real portfolio data integration is pending.');
    });

    it('should handle invalid trading commands', async () => {
      const invalidMessage: TelegramMessage = {
        message_id: 6,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/invalidcommand',
      };

      const result = await processTelegramUpdate({ update_id: 6, message: invalidMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('❌ Unknown command: /invalidcommand');
      expect(result!.text).toContain('Type /help for available commands.');
    });
  });

  describe('Callback Query Handler', () => {
    it('should handle inline keyboard callbacks', async () => {
      const callbackQuery: TelegramUpdate['callback_query'] = {
        id: 'callback_123',
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        message: {
          message_id: 7,
          chat: { id: 123456789, type: 'private' as const },
          date: Date.now() / 1000,
          text: 'Settings menu',
        },
        data: 'settings_notifications',
      };

      const result = await processTelegramUpdate({ update_id: 7, callback_query: callbackQuery }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('answerCallbackQuery');
      expect(result!.callback_query_id).toBe('callback_123');
    });

    it('should handle callback errors gracefully', async () => {
      const callbackQuery: TelegramUpdate['callback_query'] = {
        id: 'callback_456',
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        data: 'invalid_callback',
        message: {
          message_id: 8,
          chat: { id: 123456789, type: 'private' as const },
          date: Date.now() / 1000,
          text: 'Some callback',
        },
      };

      await expect(processTelegramUpdate({ update_id: 8, callback_query: callbackQuery }, mockContext))
        .rejects.toThrow('Invalid callback data');
    });
  });

  describe('Message Handler', () => {
    it('should handle text messages without commands', async () => {
      const textMessage: TelegramMessage = {
        message_id: 8,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: 'Hello bot!',
      };

      const result = await processTelegramUpdate({ update_id: 9, message: textMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toBe('🤖 I understand you\'re trying to communicate, but I only respond to commands.\n\nType /help to see available commands.');
      expect(result!.parse_mode).toBe('HTML');
    });

    it('should handle messages with special characters', async () => {
      const specialMessage: TelegramMessage = {
        message_id: 9,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' as const },
        date: Date.now() / 1000,
        text: '!@#$%^&*()',
      };

      const result = await processTelegramUpdate({ update_id: 10, message: specialMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toBe('🤖 I understand you\'re trying to communicate, but I only respond to commands.\n\nType /help to see available commands.');
      expect(result!.parse_mode).toBe('HTML');
    });

    it('should handle empty messages', async () => {
      const emptyMessage: TelegramMessage = {
        message_id: 10,
        date: Date.now(),
        chat: { id: 123456789, type: 'private' as const },
        from: { id: 123456789, is_bot: false, first_name: 'John' },
        text: '',
      };
      const update = { update_id: 11, message: emptyMessage };
      const result = await processTelegramUpdate(update, mockContext);
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const message: TelegramMessage = {
        message_id: 11,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' },
        date: Date.now() / 1000,
        text: '/start',
      };

      // Mock UserService to throw network error
      const { UserService } = await import('../../../../../src/shared/src/services');
      const originalFindUserByTelegramId = UserService.prototype.findUserByTelegramId;
      UserService.prototype.findUserByTelegramId = vi.fn().mockRejectedValue(new Error('Network timeout'));

      try {
        await expect(processTelegramUpdate({ update_id: 12, message: message }, mockContext))
          .rejects.toThrow('Network timeout');
      } finally {
        // Restore original method
        UserService.prototype.findUserByTelegramId = originalFindUserByTelegramId;
      }
    });

    it('should handle API rate limits', async () => {
      const message: TelegramMessage = {
        message_id: 12,
        from: { id: 123456789, is_bot: false, first_name: 'User' },
        chat: { id: 123456789, type: 'private' },
        date: Date.now() / 1000,
        text: '/help',
      };

      // Trigger rate limiting by making multiple rapid requests
      // First 10 requests should succeed, 11th should be rate limited
      for (let i = 0; i < 10; i++) {
        await processTelegramUpdate({ update_id: i + 100, message: { ...message, message_id: i } }, mockContext);
      }

      // The 11th request should trigger rate limiting
      await expect(processTelegramUpdate({ update_id: 111, message: { ...message, message_id: 11 } }, mockContext))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('User Authentication', () => {
    it('should authenticate valid users', async () => {
      const authenticatedMessage: TelegramMessage = {
        message_id: 13,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'AuthUser',
          username: 'authuser',
        },
        chat: { id: 123456789, type: 'private' },
        date: Date.now() / 1000,
        text: '/portfolio',
      };

      const result = await processTelegramUpdate({ update_id: 13, message: authenticatedMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(123456789);
      expect(result!.text).toContain('[DEMO MODE]');
      expect(result!.text).toContain('📊 <b>Your Portfolio</b>');
    });

    it('should reject unauthorized users', async () => {
      const unauthorizedMessage: TelegramMessage = {
        message_id: 14,
        from: {
          id: 999999999,
          is_bot: false,
          first_name: 'Unauthorized',
        },
        chat: { id: 999999999, type: 'private' as const },
        date: Date.now() / 1000,
        text: '/createinvites',
      };

      const result = await processTelegramUpdate({ update_id: 14, message: unauthorizedMessage }, mockContext);

      expect(result).toBeTruthy();
      expect(result!.method).toBe('sendMessage');
      expect(result!.chat_id).toBe(999999999);
      expect(result!.text).toContain('❌ <b>Access Denied</b>');
      expect(result!.text).toContain('This command is only available to administrators.');
    });
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});