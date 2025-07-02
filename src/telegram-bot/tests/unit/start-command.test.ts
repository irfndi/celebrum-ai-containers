/**
 * Unit tests for the /start command handler
 * Tests all scenarios: new user registration, existing user, invalid codes, etc.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { processTelegramUpdate, initializeHandlers } from '../../src/handlers/index';
import type { TelegramUpdate, TelegramWebhookContext } from '../../src/types/index';
import type { Env } from '../../../shared/src/types/index';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { ValidationError, NotFoundError } from '../../../shared/src/errors/index';

// Mock implementations
class MockKVNamespace {
  private store = new Map<string, { value: string; expiration?: number }>();

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expiration = options?.expirationTtl ? Date.now() + (options.expirationTtl * 1000) : undefined;
    this.store.set(key, { value, expiration });
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiration && Date.now() > item.expiration) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

interface MockUser {
  id: string;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  languageCode?: string;
  created_at: string;
  updated_at: string;
}

interface MockInvitationUsage {
  userId: string;
  telegramId: number;
  usedAt: Date;
}

interface MockInvitation {
  code: string;
  maxUses: number;
  used: number;
  expiresAt?: Date;
  createdAt: Date;
  usedBy?: MockInvitationUsage[];
}

class MockD1Database {
  private users = new Map<string, MockUser>();
  private invitations = new Map<string, MockInvitation>();

  // Clear all data
  clear() {
    this.users.clear();
    this.invitations.clear();
  }

  // Mock user operations
  findUserByTelegramId(telegramId: string) {
    return this.users.get(telegramId) || null;
  }

  createUser(userData: Record<string, unknown>) {
    const user: MockUser = {
      id: String(Date.now()),
      telegram_id: userData.telegramId as string,
      username: userData.username as string | undefined,
      first_name: userData.first_name as string,
      last_name: userData.last_name as string | undefined,
      languageCode: userData.languageCode as string | undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(userData.telegramId as string, user);
    return user;
  }

  // Mock invitation operations
  validateInvitationCode(code: string) {
    const invitation = this.invitations.get(code);
    if (!invitation) {
      throw new ValidationError('Invalid invitation code');
    }
    if (invitation.used >= invitation.maxUses) {
      throw new ValidationError('Invitation code has reached maximum uses');
    }
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new ValidationError('Invitation code has expired');
    }
    return invitation;
  }

  useInvitationCode(code: string, userId: string, telegramId: number) {
    const invitation = this.invitations.get(code);
    if (invitation) {
      invitation.used += 1;
      invitation.usedBy = invitation.usedBy || [];
      invitation.usedBy.push({ userId, telegramId, usedAt: new Date() });
    }
  }

  // Helper methods for testing
  addInvitation(code: string, maxUses = 1, expiresAt?: Date) {
    this.invitations.set(code, {
      code,
      maxUses,
      used: 0,
      expiresAt,
      createdAt: new Date()
    });
  }

}


function createTestUpdate(text: string, userId = 12345, chatId = 67890): TelegramUpdate {
  return {
    update_id: Date.now(),
    message: {
      message_id: Date.now(),
      date: Math.floor(Date.now() / 1000),
      text,
      from: {
        id: userId,
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en'
      },
      chat: {
        id: chatId,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        type: 'private'
      }
    }
  };
}

// Initialize mocks at module level
const mockDb = new MockD1Database();
const mockKv = new MockKVNamespace();
let mockContext: TelegramWebhookContext;

// Mock the database at module level
vi.mock('@celebrum-ai/db', () => ({
  createDb: vi.fn(() => mockDb)
}));

// Mock the services at module level
vi.mock('@celebrum-ai/shared', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    createSession: vi.fn().mockResolvedValue({ sessionId: 'test-session-id' }),
    getSession: vi.fn().mockResolvedValue(null),
    updateSession: vi.fn().mockResolvedValue(undefined),
    deleteSessionByTelegramId: vi.fn().mockResolvedValue(undefined)
  })),
  UserService: vi.fn().mockImplementation(() => ({
    findUserByTelegramId: vi.fn().mockImplementation((telegramId: string) => 
      mockDb.findUserByTelegramId(telegramId)
    ),
    createUser: vi.fn().mockImplementation((userData: Record<string, unknown>) => 
      mockDb.createUser(userData)
    )
  })),
  InvitationService: vi.fn().mockImplementation(() => ({
    validateInvitationCode: vi.fn().mockImplementation((code: string) => 
      mockDb.validateInvitationCode(code)
    ),
    useInvitationCode: vi.fn().mockImplementation((code: string, userId: string, telegramId: number) => 
      mockDb.useInvitationCode(code, userId, telegramId)
    )
  }))
}));

describe('/start Command Handler', () => {
  beforeEach(() => {
    // Reset mocks
    mockDb.clear();
    mockKv.clear();
    
    // Mock the context
    mockContext = {
      env: {
        DB: mockDb as unknown as D1Database,
        SESSIONS: mockKv as unknown as KVNamespace,
        TELEGRAM_BOT_TOKEN: 'test-token',
        ADMIN_TELEGRAM_IDS: '123456789'
      } as unknown as Env,
      request: new Request('https://example.com'),
      waitUntil: vi.fn()
    };

    // Initialize handlers
    initializeHandlers();
  });

  test('should welcome existing user without invitation code', async () => {
    // Setup: Add existing user
    const telegramId = '12345';
    mockDb.createUser({
      telegramId,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser'
    });

    // Test: Send /start command
    const update = createTestUpdate('/start', 12345);
    const response = await processTelegramUpdate(update, mockContext);

    // Verify: Should welcome existing user
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Welcome back');
    expect(response?.text).toContain('Test');
    expect(response?.text).toContain('Session ID:');
  });

  test('should require invitation code for new user', async () => {
    // Test: Send /start command without invitation code
    const update = createTestUpdate('/start', 54321);
    const response = await processTelegramUpdate(update, mockContext);

    // Verify: Should request invitation code
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Invitation Required');
    expect(response?.text).toContain('/start YOUR_INVITATION_CODE');
    expect(response?.text).toContain('private beta');
  });

  test('should register new user with valid invitation code', async () => {
    // Setup: Add valid invitation code
    const invitationCode = 'VALID123';
    mockDb.addInvitation(invitationCode, 5);

    // Test: Send /start command with valid invitation code
    const update = createTestUpdate(`/start ${invitationCode}`, 54321);
    const response = await processTelegramUpdate(update, mockContext);

    // Verify: Should register user and welcome them
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Welcome to Celebrum Trading Platform');
    expect(response?.text).toContain('Your account has been created');
    expect(response?.text).toContain('Session ID:');
    expect(response?.text).toContain('Market Analysis');
    expect(response?.text).toContain('Trading Tools');
  });

  test('should reject invalid invitation code', async () => {
    // Test: Send /start command with invalid invitation code
    const update = createTestUpdate('/start INVALID123', 54321);
    const response = await processTelegramUpdate(update, mockContext);

    // Verify: Should reject invalid code
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Invalid Invitation Code');
    expect(response?.text).toContain('invalid, expired, or has reached its maximum usage');
    expect(response?.text).toContain('/start YOUR_INVITATION_CODE');
  });

  test('should reject expired invitation code', async () => {
    // Setup: Add expired invitation code
    const invitationCode = 'EXPIRED123';
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    mockDb.addInvitation(invitationCode, 5, pastDate);

    // Test: Send /start command with expired invitation code
    const update = createTestUpdate(`/start ${invitationCode}`, 54321);
    const response = await processTelegramUpdate(update, mockContext);

    // Verify: Should reject expired code
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Invalid Invitation Code');
    expect(response?.text).toContain('invalid, expired, or has reached its maximum usage');
  });

  test('should reject invitation code at maximum usage', async () => {
    // Setup: Add invitation code at max usage
    const invitationCode = 'MAXED123';
    mockDb.addInvitation(invitationCode, 1);
    
    // Use the invitation code once
    mockDb.useInvitationCode(invitationCode, 'user1', 11111);

    // Test: Try to use the same invitation code again
    const update = createTestUpdate(`/start ${invitationCode}`, 54321);
    const response = await processTelegramUpdate(update, mockContext);

    // Verify: Should reject maxed out code
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Invalid Invitation Code');
    expect(response?.text).toContain('invalid, expired, or has reached its maximum usage');
  });

  // TODO: Fix database error handling test
  // test('should handle database errors gracefully', async () => {
  //   // This test needs to be implemented with proper scoped mocking
  // });

  test('should handle missing user data gracefully', async () => {
    // Test: Send update without proper user data
    const incompleteUpdate: TelegramUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        date: Math.floor(Date.now() / 1000),
        text: '/start',
        chat: {
          id: 67890,
          type: 'private'
        }
        // Missing 'from' field
      }
    };

    const response = await processTelegramUpdate(incompleteUpdate, mockContext);

    // Verify: Should handle gracefully (return null or appropriate response)
    expect(response).toBeNull();
  });

  test('should preserve user language preference', async () => {
    // Setup: Add valid invitation code
    const invitationCode = 'LANG123';
    mockDb.addInvitation(invitationCode, 5);

    // Test: Send /start command with language code
    const update = createTestUpdate(`/start ${invitationCode}`, 54321);
    update.message!.from!.language_code = 'es'; // Spanish

    const response = await processTelegramUpdate(update, mockContext);

    // Verify: User should be created with language preference
    expect(response).toBeTruthy();
    expect(response?.method).toBe('sendMessage');
    expect(response?.text).toContain('Welcome to Celebrum Trading Platform');
    
    // Check that user was created with language code
    const createdUser = mockDb.findUserByTelegramId('54321');
    expect(createdUser).toBeTruthy();
    expect(createdUser?.languageCode).toBe('es');
  });

  test('should create session for both new and existing users', async () => {
    // Test 1: Existing user
    const existingTelegramId = 12345;
    mockDb.createUser({
      telegramId: existingTelegramId.toString(),
      firstName: 'Existing',
      lastName: 'User'
    });

    const existingUserUpdate = createTestUpdate('/start', existingTelegramId);
    const existingUserResponse = await processTelegramUpdate(existingUserUpdate, mockContext);

    expect(existingUserResponse?.text).toContain('Session ID:');

    // Test 2: New user with invitation
    const invitationCode = 'SESSION123';
    mockDb.addInvitation(invitationCode, 5);

    const newUserUpdate = createTestUpdate(`/start ${invitationCode}`, 54321);
    const newUserResponse = await processTelegramUpdate(newUserUpdate, mockContext);

    expect(newUserResponse?.text).toContain('Session ID:');
  });
});