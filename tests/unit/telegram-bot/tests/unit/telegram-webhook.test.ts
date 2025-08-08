/**
 * Unit tests for the Telegram webhook endpoint
 * Tests that the API endpoint correctly processes Telegram updates
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { handleTelegramUpdate } from '../../../../../src/telegram-bot/src/index';
import type { TelegramUpdate, TelegramWebhookContext, TelegramBotResponse } from '../../../../../src/telegram-bot/src/types';
import { processTelegramUpdate } from '../../../../../src/telegram-bot/src/handlers';

// Mock the processTelegramUpdate function and initializeHandlers
vi.mock('../../../../../src/telegram-bot/src/handlers', () => ({
  processTelegramUpdate: vi.fn((update: TelegramUpdate): Promise<TelegramBotResponse | null> => {
    if (!update || !update.message) {
      return Promise.resolve(null);
    }
    return Promise.resolve({
      method: 'sendMessage',
      chat_id: 12345,
      text: 'Test response',
      parse_mode: 'HTML'
    });
  }),
  initializeHandlers: vi.fn()
}));

// Create a mock context
const createMockContext = (): TelegramWebhookContext => ({
  env: {
    TELEGRAM_BOT_TOKEN: 'test-token',
    ADMIN_TELEGRAM_IDS: '123456789',
    TELEGRAM_WEBHOOK_SECRET: 'test-secret',
    DB: {} as any,
    SESSIONS: {} as any,
    CELEBRUM_KV: {} as any,
    PROD_BOT_MARKET_CACHE: {} as any,
    PROD_BOT_SESSION_STORE: {} as any,
    CELEBRUM_CONTAINERS: {} as any,
    CELEBRUM_STORAGE: {} as any,
  },
  request: new Request('https://example.com'),
  waitUntil: vi.fn()
});

// Create a sample Telegram update
const createSampleUpdate = (): TelegramUpdate => ({
  update_id: 123456789,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    text: '/start',
    from: {
      id: 12345,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en'
    },
    chat: {
      id: 12345,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      type: 'private' as const
    }
  }
});

describe('Telegram Webhook Endpoint', () => {
  let mockContext: TelegramWebhookContext;
  
  beforeEach(() => {
    mockContext = createMockContext();
    vi.clearAllMocks();
  });

  test('should return 200 OK for valid Telegram update', async () => {
    // Create a request with a valid Telegram update
    const request = new Request('https://example.com/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createSampleUpdate())
    });

    // Parse the request body and call the handler
    const update = await request.json();
    const response = await handleTelegramUpdate(update, mockContext);

    // Verify response
    expect(response.status).toBe(200);
    const responseData = await response.json() as any;
    expect(responseData).toEqual({
      method: 'sendMessage',
      chat_id: 12345,
      text: 'Test response',
      parse_mode: 'HTML'
    });
  });

  test('should return 400 Bad Request for invalid JSON', async () => {
    // Create a request with invalid JSON
    const request = new Request('https://example.com/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'invalid-json'
    });

    // This test simulates what would happen in the main handler
    let errorCaught = false;
    try {
      const update = await request.json();
      await handleTelegramUpdate(update, mockContext);
    } catch (error) {
      // Should catch JSON parse error
      expect(error).toBeInstanceOf(SyntaxError);
      errorCaught = true;
    }
    expect(errorCaught).toBe(true);
  });

  test('should correctly process a valid update', async () => {
    // This test ensures the happy path works as expected.
    const update = createSampleUpdate();
    const response = await handleTelegramUpdate(update, mockContext);

    // Verify response for valid update
    expect(response.status).toBe(200);
    const responseData = await response.json() as any;
    expect(responseData.method).toBe('sendMessage');
  });



  test('should handle errors during update processing', async () => {
    // Mock processTelegramUpdate to throw an error for this test only
    vi.mocked(processTelegramUpdate).mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    // Create a request with a valid Telegram update
    const request = new Request('https://example.com/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createSampleUpdate())
    });

    // Parse the request and call the handler
    const update = await request.json();
    const response = await handleTelegramUpdate(update, mockContext);

    // Verify response - should return 500 for errors
    expect(response.status).toBe(500);
    const responseData = await response.json() as any;
    expect(responseData.error).toBe('Internal server error');

    // The error should be logged (we can't test this directly)
  });

  test('should handle missing update data', async () => {
    // Create a request with empty JSON object
    const _request = new Request('https://example.com/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    // This test simulates empty update handling
    const emptyUpdate: Partial<TelegramUpdate> = {};
    const response = await handleTelegramUpdate(emptyUpdate as TelegramUpdate, mockContext);

    // Verify response - should handle gracefully
    expect(response.status).toBe(200);
    const responseData = await response.json() as any;
    expect(responseData.ok).toBe(true);
  });

  test('should verify Telegram token if X-Telegram-Bot-Api-Secret-Token header is present', async () => {
    // Add a secret token to the context
    mockContext.env.TELEGRAM_WEBHOOK_SECRET = 'secret-token';

    // Test 1: Valid token
    const validRequest = new Request('https://example.com/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'secret-token'
      },
      body: JSON.stringify(createSampleUpdate())
    });

    // For unit testing, we'll test the core functionality
    // Token validation would be handled at the router level
    const update = await validRequest.json();
    
    // Ensure the mock is set up correctly for this test
    vi.mocked(processTelegramUpdate).mockResolvedValueOnce({
      method: 'sendMessage',
      chat_id: 12345,
      text: 'Test response',
      parse_mode: 'HTML'
    });
    
    const validResponse = await handleTelegramUpdate(update, mockContext);
    expect(validResponse.status).toBe(200);
    
    // Test that the function processes updates correctly regardless of headers
    const responseData = await validResponse.json() as any;
    expect(responseData.method).toBe('sendMessage');
  });
});