/**
 * Telegram Bot test fixtures for consistent testing
 */

import type { Update, Message, User, Chat, CallbackQuery, InlineQuery } from 'grammy/types';

// Telegram User Fixtures
export const mockTelegramUser: User = {
  id: 123456789,
  is_bot: false,
  first_name: 'John',
  last_name: 'Doe',
  username: 'testuser',
  language_code: 'en'
};

export const mockTelegramUserNoUsername: User = {
  id: 987654321,
  is_bot: false,
  first_name: 'Jane',
  last_name: 'Smith',
  language_code: 'en'
};

export const mockTelegramBot: User = {
  id: 555666777,
  is_bot: true,
  first_name: 'Celebrum AI Bot',
  username: 'celebrum_ai_bot'
};

// Telegram Chat Fixtures
export const mockPrivateChat: Chat = {
  id: 123456789,
  type: 'private',
  first_name: 'John',
  last_name: 'Doe',
  username: 'testuser'
};

export const mockGroupChat: Chat = {
  id: -1001234567890,
  type: 'group',
  title: 'Test Group'
};

export const mockSuperGroupChat: Chat = {
  id: -1001234567891,
  type: 'supergroup',
  title: 'Test Supergroup',
  username: 'test_supergroup'
};

// Telegram Message Fixtures
export const mockTextMessage: Message = {
  message_id: 1,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/start'
};

export const mockStartMessage: Message = {
  message_id: 2,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/start',
  entities: [{
    type: 'bot_command',
    offset: 0,
    length: 6
  }]
};

export const mockHelpMessage: Message = {
  message_id: 3,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/help',
  entities: [{
    type: 'bot_command',
    offset: 0,
    length: 5
  }]
};

export const mockSettingsMessage: Message = {
  message_id: 4,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/settings',
  entities: [{
    type: 'bot_command',
    offset: 0,
    length: 9
  }]
};

export const mockPortfolioMessage: Message = {
  message_id: 5,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/portfolio',
  entities: [{
    type: 'bot_command',
    offset: 0,
    length: 10
  }]
};

export const mockSignalsMessage: Message = {
  message_id: 6,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/signals',
  entities: [{
    type: 'bot_command',
    offset: 0,
    length: 8
  }]
};

export const mockInvalidCommandMessage: Message = {
  message_id: 7,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: '/invalidcommand'
};

export const mockPlainTextMessage: Message = {
  message_id: 8,
  date: Math.floor(Date.now() / 1000),
  chat: mockPrivateChat,
  from: mockTelegramUser,
  text: 'Hello, this is a plain text message'
};

// Callback Query Fixtures
export const mockCallbackQuery: CallbackQuery = {
  id: 'callback_123',
  from: mockTelegramUser,
  message: mockTextMessage,
  chat_instance: 'chat_instance_123',
  data: 'settings_notifications'
};

export const mockSettingsCallbackQuery: CallbackQuery = {
  id: 'callback_456',
  from: mockTelegramUser,
  message: mockTextMessage,
  chat_instance: 'chat_instance_456',
  data: 'settings_theme_dark'
};

export const mockPortfolioCallbackQuery: CallbackQuery = {
  id: 'callback_789',
  from: mockTelegramUser,
  message: mockTextMessage,
  chat_instance: 'chat_instance_789',
  data: 'portfolio_view_positions'
};

// Inline Query Fixtures
export const mockInlineQuery: InlineQuery = {
  id: 'inline_123',
  from: mockTelegramUser,
  query: 'BTC price',
  offset: ''
};

export const mockInlineQueryEmpty: InlineQuery = {
  id: 'inline_456',
  from: mockTelegramUser,
  query: '',
  offset: ''
};

// Update Fixtures
export const mockMessageUpdate: Update = {
  update_id: 1,
  message: {
    ...mockStartMessage,
    chat: mockPrivateChat,
    from: mockTelegramUser
  }
};

export const mockCallbackQueryUpdate: Update = {
  update_id: 2,
  callback_query: {
    ...mockCallbackQuery,
    message: {
      ...mockTextMessage,
      chat: mockPrivateChat,
      from: mockTelegramUser
    }
  }
};

export const mockInlineQueryUpdate: Update = {
  update_id: 3,
  inline_query: mockInlineQuery
};

// Webhook Fixtures
export const mockWebhookRequest = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Telegram-Bot-Api-Secret-Token': 'test-secret'
  },
  body: JSON.stringify(mockMessageUpdate)
};

export const mockWebhookRequestInvalid = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Telegram-Bot-Api-Secret-Token': 'invalid-secret'
  },
  body: JSON.stringify(mockMessageUpdate)
};

// Bot Response Fixtures
export const mockBotResponse = {
  method: 'sendMessage',
  chat_id: 123456789,
  text: 'Welcome to Celebrum AI! 🚀',
  parse_mode: 'HTML' as const
};

export const mockBotErrorResponse = {
  ok: false,
  error_code: 400,
  description: 'Bad Request: message text is empty'
};

// Helper functions for creating test data
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockTelegramUser,
  ...overrides
});

export const createMockChat = (overrides: Partial<typeof mockPrivateChat> = {}) => ({
  ...mockPrivateChat,
  ...overrides
});

export const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  ...mockTextMessage,
  ...overrides
});

export const createMockUpdate = (overrides: Partial<Update> = {}): Update => ({
  ...mockMessageUpdate,
  ...overrides
});

export const createMockCallbackQuery = (overrides: Partial<CallbackQuery> = {}): CallbackQuery => ({
  ...mockCallbackQuery,
  chat_instance: 'default_chat_instance',
  ...overrides
});

// Command-specific fixtures
export const mockCommands = {
  start: mockStartMessage,
  help: mockHelpMessage,
  settings: mockSettingsMessage,
  portfolio: mockPortfolioMessage,
  signals: mockSignalsMessage,
  invalid: mockInvalidCommandMessage
};

// Conversation state fixtures
export const mockConversationStates = {
  idle: { state: 'idle', data: {} },
  awaitingApiKey: { state: 'awaiting_api_key', data: { exchange: 'binance' } },
  awaitingConfirmation: { state: 'awaiting_confirmation', data: { action: 'delete_position', positionId: '123' } },
  settingsMenu: { state: 'settings_menu', data: { currentPage: 1 } }
};

// Error scenarios
export const mockErrorScenarios = {
  networkError: new Error('Network request failed'),
  telegramApiError: { ok: false, error_code: 429, description: 'Too Many Requests' },
  invalidJson: 'invalid json string',
  missingSecretToken: {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockMessageUpdate)
  }
};

// Bulk test data generators
export const generateMockUsers = (count: number): User[] => {
  const users: User[] = [];
  
  for (let i = 0; i < count; i++) {
    users.push({
      id: 100000000 + i,
      is_bot: false,
      first_name: `User${i}`,
      last_name: `Test${i}`,
      username: `user${i}`,
      language_code: ['en', 'es', 'fr', 'de'][i % 4]
    });
  }
  
  return users;
};

export const generateMockMessages = (count: number, chatId: number = 123456789): Message[] => {
  const messages: Message[] = [];
  const commands = ['/start', '/help', '/settings', '/portfolio', '/signals'];
  
  for (let i = 0; i < count; i++) {
    messages.push({
      message_id: i + 1,
      date: Math.floor(Date.now() / 1000) - (count - i) * 60, // 1 minute apart
      chat: { ...mockPrivateChat, id: chatId },
      from: { ...mockTelegramUser, id: 100000000 + (i % 10) },
      text: i % 5 === 0 ? commands[i % commands.length] : `Test message ${i}`
    });
  }
  
  return messages;
};