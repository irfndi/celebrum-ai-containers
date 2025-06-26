/**
 * Test file for Telegram bot functionality
 * This file can be used to test handlers and utilities locally
 */

import { 
  initializeHandlers, 
  processTelegramUpdate, 
  getAllHandlers 
} from '../../src/handlers/index';
import { TelegramUpdate, TelegramWebhookContext } from '../../src/types/index';
import { extractCommand, getChatId, getUserId } from '../../src/utils/index';

// Mock environment for testing
const mockEnv = {
  TELEGRAM_BOT_TOKEN: 'test-token',
  DB: {} as any, // Mock D1Database
  ArbEdgeD1: {} as any, // Mock D1Database
  SESSIONS: {} as any, // Mock KVNamespace
  CELEBRUM_KV: {} as any, // Mock KVNamespace
  PROD_BOT_MARKET_CACHE: {} as any, // Mock KVNamespace
  PROD_BOT_SESSION_STORE: {} as any, // Mock KVNamespace
  CELEBRUM_CONTAINERS: {} as any, // Mock DurableObjectNamespace
};

// Mock context for testing
const mockContext: TelegramWebhookContext = {
  env: mockEnv,
  request: new Request('https://example.com'), // Mock Request object
  waitUntil: (_promise: Promise<any>) => {
    // In real Cloudflare Workers, this extends the execution context
    // For testing, we can just log or ignore
    console.log('waitUntil called with promise');
  }
};

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

// Test all handlers
async function testHandlers() {
  console.log('🧪 Testing Telegram Bot Handlers\n');
  
  // Initialize handlers
  initializeHandlers();
  
  // Get all registered handlers
  const handlers = getAllHandlers();
  console.log(`📋 Registered handlers: ${handlers.map(h => h.command).join(', ')}\n`);
  
  // Test each command
  const testCommands = ['start', 'help', 'opportunities', 'balance', 'profile', 'settings', 'status'];
  
  for (const command of testCommands) {
    console.log(`🔍 Testing /${command} command:`);
    
    try {
      const update = createTestUpdate(command);
      const response = await processTelegramUpdate(update, mockContext);
      
      if (response) {
        console.log(`✅ Response received:`);
        console.log(`   Method: ${response.method}`);
        console.log(`   Chat ID: ${response.chat_id}`);
        console.log(`   Text preview: ${response.text?.substring(0, 100)}...`);
      } else {
        console.log(`❌ No response received`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
    
    console.log('');
  }
}

// Test utility functions
function testUtilities() {
  console.log('🧪 Testing Utility Functions\n');
  
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
    console.log(`📝 "${message}" → command: ${command || 'null'}`);
  });
  
  console.log('');
  
  // Test update parsing
  const testUpdate = createTestUpdate('test');
  const chatId = getChatId(testUpdate);
  const userId = getUserId(testUpdate);
  
  console.log(`🔍 Test update parsing:`);
  console.log(`   Chat ID: ${chatId}`);
  console.log(`   User ID: ${userId}`);
  console.log('');
}

// Test callback query handling
async function testCallbackQuery() {
  console.log('🧪 Testing Callback Query Handling\n');
  
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
    const response = await processTelegramUpdate(callbackUpdate, mockContext);
    if (response) {
      console.log(`✅ Callback query response:`);
      console.log(`   Method: ${response.method}`);
      console.log(`   Text preview: ${response.text?.substring(0, 100)}...`);
    } else {
      console.log(`❌ No callback query response`);
    }
  } catch (error) {
    console.log(`❌ Callback query error: ${error}`);
  }
  
  console.log('');
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Telegram Bot Tests\n');
  console.log('=' .repeat(50));
  
  testUtilities();
  await testHandlers();
  await testCallbackQuery();
  
  console.log('=' .repeat(50));
  console.log('✅ All tests completed!\n');
}

// Export for use in other test files
export {
  createTestUpdate,
  mockContext,
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