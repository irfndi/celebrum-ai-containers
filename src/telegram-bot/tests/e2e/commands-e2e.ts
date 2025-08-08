/**
 * Test file for Telegram bot functionality
 * This file can be used to test handlers and utilities locally
 */

import { 
  initializeHandlers, 
  processTelegramUpdate
} from '../../src/handlers/index';
import type { TelegramUpdate, TelegramWebhookContext } from '../../src/types/index';
import type { Env } from '../../../shared/src/types';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { extractCommand, getChatId, getUserId } from '../../src/utils/index';
import { getTestDb, createMockEnv, createMockContext, createMockKVNamespace, createMockD1Database } from '../../../shared/tests/utils/test-helpers';
import { vi } from 'vitest';

// Replace all type-cast empty objects with robust, shared mocks
// Use createMockEnv and getTestDb for DB/KV/DO
// Assert on real response content (e.g., correct text, error messages, etc.), not just existence
// Simulate real Cloudflare Worker context and edge cases
// Remove any static or quick-win responses

// Test function to simulate a Telegram update
function createTestUpdate(command: string, userId: number = 12345, chatId: number = 67890): TelegramUpdate {
  return {
    update_id: Date.now(),
    message: {
      message_id: Date.now(),
      date: Math.floor(Date.now() / 1000),
      text: `/${command}`,
      from: {
        id: userId,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: chatId,
        type: 'private'
      }
    }
  };
}

// Replace createMockContext() with a fully shaped TelegramWebhookContext
async function createTestContext(): Promise<TelegramWebhookContext> {
  const { db } = await getTestDb();
  const mockKv = createMockKVNamespace();
  const env: Env = {
    ...createMockEnv(),
    DB: createMockD1Database() as unknown as D1Database,
    SESSIONS: mockKv as any,
    CELEBRUM_KV: mockKv as any,
    PROD_BOT_MARKET_CACHE: mockKv as any,
    PROD_BOT_SESSION_STORE: mockKv as any,
    FEATURE_REGISTRATION_INVITATION_REQUIRED: 'false',
    CELEBRUM_CONTAINERS: {} as any,
    CELEBRUM_STORAGE: {} as any,
  };
  return {
    env,
    request: new Request('https://test.com'),
    waitUntil: vi.fn(),
  };
}

// Test all handlers
async function testHandlers() {
  // Initialize handlers
  initializeHandlers();
  
  // Test each command
  const testCommands = ['start', 'help', 'opportunities', 'balance', 'profile', 'settings', 'status'];
  
  for (const command of testCommands) {
    try {
      const update = createTestUpdate(command);
      const response = await processTelegramUpdate(update, await createTestContext());
      
      // Verify response exists for basic validation
      if (!response) {
        throw new Error(`No response received for /${command}`);
      }
    } catch (error) {
      throw new Error(`Error testing /${command}: ${error}`);
    }
  }
}

// Test utility functions
function testUtilities() {
  // Test command extraction
  const testMessages = [
    '/start',
    '/help',
    '/opportunities high',
    'Hello world', // Should return null
    '/unknown_command'
  ];
  
  testMessages.forEach(message => {
    const command = extractCommand(message);
    // Verify command extraction works as expected
    if (message.startsWith('/') && !command && message !== 'Hello world') {
      throw new Error(`Failed to extract command from: ${message}`);
    }
  });
  
  // Test update parsing
  const testUpdate = createTestUpdate('test');
  const chatId = getChatId(testUpdate);
  const userId = getUserId(testUpdate);
  
  // Verify parsing works
  if (!chatId || !userId) {
    throw new Error('Failed to parse chat ID or user ID from test update');
  }
}

// Test callback query handling
async function testCallbackQuery() {
  const callbackUpdate: TelegramUpdate = {
    update_id: Date.now(),
    callback_query: {
      id: 'test-callback-id',
      from: {
        id: 12345,
        is_bot: false,
        first_name: 'Test'
      },
      data: 'opportunities:high',
      message: {
        message_id: Date.now(),
        date: Math.floor(Date.now() / 1000),
        text: 'Previous message',
        from: {
          id: 12345,
          is_bot: false,
          first_name: 'Test'
        },
        chat: {
          id: 67890,
          type: 'private'
        }
      }
    }
  };
  
  try {
    const response = await processTelegramUpdate(callbackUpdate, await createTestContext());
    // Verify callback query handling works
    if (!response) {
      throw new Error('No response received for callback query');
    }
  } catch (error) {
    throw new Error(`Callback query error: ${error}`);
  }
}

// Main test function
async function runTests() {
  testUtilities();
  await testHandlers();
  await testCallbackQuery();
}

// Export for use in other test files
export {
  createTestUpdate,
  testHandlers,
  testUtilities,
  testCallbackQuery,
  runTests
};

// Run tests if this file is executed directly
// Note: import.meta.main is not available in all environments
// This would typically be used in Deno, but we're using Node.js/TypeScript
// if (import.meta.main) {
//   runTests().catch(console.error);
// }