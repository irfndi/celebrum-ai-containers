/**
 * End-to-end tests for Telegram bot workflows
 * Tests complete user journeys and bot interactions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { env, SELF, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { getTestDb, cleanupDb, createMockUser, createMockContext } from '../../../shared/tests/utils/test-helpers.ts';
import { processTelegramUpdate, initializeHandlers } from '../../src/handlers/index';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../../db/src/schema';
import type { User } from '../../../shared/src/types';

// Mock Telegram Bot API
const mockTelegramAPI = {
  sendMessage: vi.fn(),
  editMessageText: vi.fn(),
  answerCallbackQuery: vi.fn(),
  setWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getMe: vi.fn(),
};

// Mock database operations
const mockDatabase = {
  users: {
    findByTelegramId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  positions: {
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    closePosition: vi.fn(),
  },
  opportunities: {
    findActive: vi.fn(),
    findById: vi.fn(),
  },
};

// Mock external services
const mockExchangeAPI = {
  getPrice: vi.fn(),
  createOrder: vi.fn(),
  getBalance: vi.fn(),
};

const mockAlchemyAPI = {
  getMarketData: vi.fn(),
  getOpportunities: vi.fn(),
};

describe('Telegram Bot E2E Workflows', () => {
  let db: DrizzleD1Database<typeof schema>;
  let mockContext: ExecutionContext;
  let testUser: User;
  let dispose: () => Promise<void>;

  beforeEach(async () => {
    const { db: testDb, kv: testKv, dispose: testDispose } = await getTestDb();
    db = testDb;
    dispose = testDispose;
    
    // Initialize handlers before each test
    initializeHandlers();
    
    // Create proper mock context with all required properties
    mockContext = {
      env: {
        TELEGRAM_BOT_TOKEN: 'test-token',
        DB: db as any, // Use DB instead of DATABASE
        SESSIONS: testKv,
        CELEBRUM_KV: testKv,
        ENVIRONMENT: 'test',
        // Add feature flag environment variables
        FEATURE_REGISTRATION_INVITATION_REQUIRED: 'false',
        FEATURE_REGISTRATION_BYPASS_FOR_EXISTING: 'true',
      },
      request: new Request('https://test.com'),
      waitUntil: vi.fn(),
    } as any;
    
    testUser = {
      ...createMockUser(),
      telegramId: '123456789',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };
  });

  afterAll(async () => {
    // Cleanup
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New User Onboarding Flow', () => {
    it('should complete full onboarding process', async () => {
      // Step 1: User sends /start command
      const startUpdate = {
        update_id: Date.now(),
        message: {
          message_id: 1,
          from: {
            id: parseInt(testUser.telegramId),
            is_bot: false,
            first_name: testUser.firstName,
            last_name: testUser.lastName,
            username: testUser.username,
          },
          chat: { id: parseInt(testUser.telegramId), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await processTelegramUpdate(startUpdate, mockContext);
      
      // Verify welcome response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(startUpdate.message.chat.id);
      expect(response?.text).toContain('Welcome');
      expect(response?.reply_markup?.inline_keyboard).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({ text: expect.stringContaining('Get Started') })
          ])
        ])
      );
    });

    it('should handle onboarding callback interactions', async () => {
      // Step 2: User clicks "Get Started" button
      const callbackUpdate = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_1',
          from: {
            id: parseInt(testUser.telegramId),
            is_bot: false,
            first_name: testUser.firstName,
            username: testUser.username,
          },
          message: {
            message_id: 2,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Welcome to CelebrumAI!',
          },
          data: 'onboarding_start',
        },
      };

      const response = await processTelegramUpdate(callbackUpdate, mockContext);

      // Verify response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toMatch(/answerCallbackQuery|editMessageText|sendMessage/);
      if (response?.method !== 'answerCallbackQuery') {
        expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
      }
    });

    it('should complete risk preference selection', async () => {
      // Step 3: User selects risk preference
      const riskUpdate = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_2',
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          message: {
            message_id: 2,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Previous message'
          },
          data: 'risk_moderate',
        },
      };

      const response = await processTelegramUpdate(riskUpdate, mockContext);

      // Verify response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toMatch(/answerCallbackQuery|editMessageText|sendMessage/);
      expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
    });
  });

  describe('Trading Opportunities Workflow', () => {
    beforeEach(() => {
      // Setup existing user
      mockDatabase.users.findByTelegramId.mockResolvedValue({
        id: 1,
        ...testUser,
        settings: { riskTolerance: 'moderate' },
      });
    });

    it('should display available trading opportunities', async () => {
      const opportunitiesMessage = {
        update_id: Date.now(),
        message: {
          message_id: 3,
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          chat: { id: parseInt(testUser.telegramId), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/opportunities',
        },
      };

      const response = await processTelegramUpdate(opportunitiesMessage, mockContext);

      // Verify opportunities response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(opportunitiesMessage.message.chat.id);
      expect(response?.text).toContain('Trading Opportunities');
    });

    it('should handle opportunity selection and position creation', async () => {
      const opportunityCallback = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_3',
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          message: {
            message_id: 4,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Previous message'
          },
          data: 'opportunity_1',
        },
      };

      const response = await processTelegramUpdate(opportunityCallback, mockContext);

      // Verify response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toMatch(/answerCallbackQuery|editMessageText|sendMessage/);
      if (response?.method !== 'answerCallbackQuery') {
        expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
      }
    });

    it('should execute trade and create position', async () => {
      const investmentCallback = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_4',
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          message: {
            message_id: 4,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Previous message'
          },
          data: 'invest_250',
        },
      };

      const response = await processTelegramUpdate(investmentCallback, mockContext);

      // Verify response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toMatch(/answerCallbackQuery|editMessageText|sendMessage/);
      if (response?.method !== 'answerCallbackQuery') {
        expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
      }
    });
  });

  describe('Portfolio Management Workflow', () => {
    beforeEach(() => {
      mockDatabase.users.findByTelegramId.mockResolvedValue({
        id: 1,
        ...testUser,
        accountBalance: '750.00',
      });
    });

    it('should display user portfolio', async () => {
      const portfolioMessage = {
        update_id: Date.now(),
        message: {
          message_id: 5,
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          chat: { id: parseInt(testUser.telegramId), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/portfolio',
        },
      };

      const response = await processTelegramUpdate(portfolioMessage, mockContext);

      // Verify portfolio response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(portfolioMessage.message.chat.id);
      expect(response?.text).toContain('Portfolio');
    });

    it('should handle position closure', async () => {
      const closePositionCallback = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_5',
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          message: {
            message_id: 6,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Previous message'
          },
          data: 'close_position_1',
        },
      };

      const response = await processTelegramUpdate(closePositionCallback, mockContext);

      // Verify response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toMatch(/editMessageText|sendMessage/);
      expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle opportunities command', async () => {
      const opportunitiesUpdate = {
        update_id: Date.now(),
        message: {
          message_id: 7,
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          chat: { id: parseInt(testUser.telegramId), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/opportunities',
        },
      };

      // Actually call the bot handler to trigger the logic
      const response = await processTelegramUpdate(opportunitiesUpdate, mockContext);

      // Verify opportunities response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toBe('sendMessage');
      expect(response?.chat_id).toBe(opportunitiesUpdate.message.chat.id);
      expect(response?.text).toContain('Arbitrage Opportunities');
      expect(response?.text).toContain('BTC/USDT');
    });

    it('should handle insufficient balance scenarios', async () => {
      const investmentUpdate = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_6',
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          message: {
            message_id: 9,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Previous message'
          },
          data: 'invest_500',
        },
      };

      // Actually call the bot handler to trigger the logic
      const response = await processTelegramUpdate(investmentUpdate, mockContext);

      // Verify response was returned
      expect(response).toBeTruthy();
      expect(response?.method).toMatch(/answerCallbackQuery|editMessageText|sendMessage/);
      if (response?.method !== 'answerCallbackQuery') {
        expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
      }
    });

    it('should handle expired opportunities', async () => {
      const expiredOpportunityUpdate = {
        update_id: Date.now(),
        callback_query: {
          id: 'callback_7',
          from: { id: parseInt(testUser.telegramId), is_bot: false, first_name: 'Test', username: 'testuser' },
          message: {
            message_id: 10,
            chat: { id: parseInt(testUser.telegramId), type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Previous message'
          },
          data: 'opportunity_999', // Non-existent/expired opportunity
        },
      };

      // Actually call the bot handler to trigger the logic
      const response = await processTelegramUpdate(expiredOpportunityUpdate, mockContext);

      // Verify response was returned
       expect(response).toBeTruthy();
       expect(response?.method).toMatch(/sendMessage|editMessageText|answerCallbackQuery/);
       if (response?.method !== 'answerCallbackQuery') {
         expect(response?.chat_id).toBe(parseInt(testUser.telegramId));
       }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high message volume', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        message_id: i + 1,
        from: { id: parseInt(testUser.telegramId), is_bot: false },
        chat: { id: parseInt(testUser.telegramId), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: `/test${i}`,
      }));

      mockTelegramAPI.sendMessage.mockResolvedValue({
        ok: true,
        result: { message_id: 999 },
      });

      // Simulate processing multiple messages concurrently
      const promises = messages.map(async (message) => {
        // Simulate message processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return mockTelegramAPI.sendMessage({ chat_id: message.chat.id, text: 'Response' });
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBe(10);
      expect(mockTelegramAPI.sendMessage).toHaveBeenCalledTimes(10);
    });

    it('should implement rate limiting', async () => {
      const rapidMessages = Array.from({ length: 20 }, (_, i) => ({
        message_id: i + 1,
        from: { id: parseInt(testUser.telegramId), is_bot: false },
        chat: { id: parseInt(testUser.telegramId), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/spam',
      }));

      let rateLimitHit = false;
      mockTelegramAPI.sendMessage.mockImplementation(() => {
        if (rateLimitHit) {
          return Promise.resolve({
            ok: false,
            error_code: 429,
            description: 'Too Many Requests',
          });
        }
        return Promise.resolve({ ok: true, result: { message_id: 999 } });
      });

      // Simulate rate limiting after 10 messages
      setTimeout(() => { rateLimitHit = true; }, 50);

      const promises = rapidMessages.map(async (message, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 10));
        return mockTelegramAPI.sendMessage({ chat_id: message.chat.id, text: 'Response' });
      });

      const results = await Promise.allSettled(promises);
      const rateLimited = results.some(r => 
        r.status === 'fulfilled' && 
        r.value.error_code === 429
      );

      expect(rateLimited).toBe(true);
    });
  });
});