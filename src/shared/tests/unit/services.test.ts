/**
 * Unit tests for shared services
 * Tests core business logic and database operations
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../src/services/UserService';
import { SessionService } from '../../src/services/SessionService';
import { InvitationService } from '../../src/services/InvitationService';
import type { KVNamespace } from '@cloudflare/workers-types';

// Mock types
type User = {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
  createdAt: Date;
};

type NewUser = Partial<User>;
type Database = any;



// Mock instances for testing
const mockUserQueries = {
  findByTelegramId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn()
};

const mockUsernameHistoryQueries = {
  findByTelegramId: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  getLatestUsername: vi.fn()
};

// Mock the database modules
vi.mock('@celebrum-ai/db', () => {
  return {
    Database: vi.fn(),
    UserQueries: vi.fn().mockImplementation(() => mockUserQueries),
    UserUsernameHistoryQueries: vi.fn().mockImplementation(() => mockUsernameHistoryQueries),
    invitationCodes: {
      id: 'mock-id',
      code: 'mock-code',
      createdBy: 'mock-creator',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: 10,
      currentUses: 0,
      isActive: true
    },
    invitationUsage: {
      id: 'mock-usage-id',
      invitationCodeId: 'mock-code-id',
      usedBy: 'mock-user',
      usedAt: new Date()
    }
  };
});

const mockDb = {} as Database;
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn()
} as unknown as KVNamespace;

// Test data
const mockUser: User = {
  id: '1',
  telegramId: '12345',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  languageCode: 'en',
  createdAt: new Date()
};

const mockNewUser: NewUser = {
  telegramId: '12345',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  languageCode: 'en'
};

// Test suites
describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService(mockDb);
  });

  test('should create a new user', async () => {
    mockUserQueries.create.mockResolvedValue(mockUser);

    const result = await userService.createUser(mockNewUser);

    expect(mockUserQueries.create).toHaveBeenCalledWith({
      telegramId: '12345',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      languageCode: 'en',
      status: 'active',
      role: 'free'
    });
    expect(result).toEqual(mockUser);
  });

  test('should find user by telegram ID', async () => {
    mockUserQueries.findByTelegramId.mockResolvedValue(mockUser);

    const result = await userService.findUserByTelegramId('12345');

    expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith('12345');
    expect(result).toEqual(mockUser);
  });

  test('should return undefined for non-existent user', async () => {
    mockUserQueries.findByTelegramId.mockResolvedValue(undefined);

    const result = await userService.findUserByTelegramId('99999');

    expect(result).toBeUndefined();
  });

  test('should update user information', async () => {
    const updatedUser = { ...mockUser, firstName: 'Jane', role: 'pro' as const };
    mockUserQueries.update.mockResolvedValue(updatedUser);

    const result = await userService.updateUser(1, {
      firstName: 'Jane',
      role: 'pro'
    });

    expect(mockUserQueries.update).toHaveBeenCalledWith(1, {
      firstName: 'Jane',
      role: 'pro'
    });
    expect(result).toEqual(updatedUser);
  });
});

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionService = new SessionService(mockKV, 3600); // 1 hour TTL
  });

  test('should create a new session', async () => {
    mockKV.put = vi.fn().mockResolvedValue(undefined);
    
    const session = await sessionService.createSession(mockUser);

    expect(session.userId).toBe(mockUser.id);
    expect(session.telegramId).toBe(mockUser.telegramId);
    expect(session.isActive).toBe(true);
    expect(mockKV.put).toHaveBeenCalledTimes(2); // session and telegram mapping
  });

  test('should get session by telegram ID', async () => {
    const sessionId = 'test-session-id';
    const sessionData = {
      id: sessionId,
      sessionId,
      userId: mockUser.id,
      telegramId: mockUser.telegramId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true
    };

    mockKV.get = vi.fn()
      .mockResolvedValueOnce(sessionId) // telegram mapping
      .mockResolvedValueOnce(JSON.stringify(sessionData)); // session data

    const result = await sessionService.getSessionByTelegramId(mockUser.telegramId);

    expect(result).toBeTruthy();
    expect(result?.userId).toBe(mockUser.id);
  });

  test('should return null for expired session', async () => {
    const sessionId = 'test-session-id';
    const expiredSessionData = {
      id: sessionId,
      sessionId,
      userId: mockUser.id,
      telegramId: mockUser.telegramId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 1000), // expired
      isActive: true
    };

    mockKV.get = vi.fn()
      .mockResolvedValueOnce(sessionId)
      .mockResolvedValueOnce(JSON.stringify(expiredSessionData));
    mockKV.delete = vi.fn().mockResolvedValue(undefined);

    const result = await sessionService.getSessionByTelegramId(mockUser.telegramId);

    expect(result).toBeNull();
    expect(mockKV.delete).toHaveBeenCalled();
  });
});

describe('InvitationService', () => {
  let invitationService: InvitationService;

  beforeEach(() => {
    vi.clearAllMocks();
    invitationService = new InvitationService(mockDb);
  });

  test('should validate invitation code', async () => {
    const mockInvitation = {
      id: 1,
      code: 'TEST123',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      maxUses: 10,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockDbQuery = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockInvitation)
    };

    mockDb.select = vi.fn().mockReturnValue(mockDbQuery);

    const result = await invitationService.validateInvitationCode('TEST123');

    expect(result).toEqual(mockInvitation);
  });

  test('should throw error for invalid invitation code', async () => {
    const mockDbQuery = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(null)
    };

    mockDb.select = vi.fn().mockReturnValue(mockDbQuery);

    await expect(invitationService.validateInvitationCode('INVALID'))
      .rejects
      .toThrow('Invalid or inactive invitation code');
  });

  test('should throw error for expired invitation code', async () => {
    const expiredInvitation = {
      id: 1,
      code: 'EXPIRED123',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() - 1000), // expired
      maxUses: 10,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockDbQuery = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(expiredInvitation)
    };

    mockDb.select = vi.fn().mockReturnValue(mockDbQuery);

    await expect(invitationService.validateInvitationCode('EXPIRED123'))
      .rejects
      .toThrow('Invitation code has expired');
  });
});

describe('Service Integration', () => {
  let userService: UserService;
  let sessionService: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService(mockDb);
    sessionService = new SessionService(mockKV, 3600);
  });

  test('should handle user creation and session creation flow', async () => {
    // Mock user creation
    mockUserQueries.create.mockResolvedValue(mockUser);
    mockKV.put = vi.fn().mockResolvedValue(undefined);

    // Create user
    const user = await userService.createUser(mockNewUser);
    expect(user).toEqual(mockUser);

    // Create session for user
    const session = await sessionService.createSession(user);
    expect(session.userId).toBe(user.id);
    expect(session.telegramId).toBe(user.telegramId);
  });
});