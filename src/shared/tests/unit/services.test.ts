/**
 * Unit tests for shared services
 * Tests core business logic and database operations
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../../src/services/UserService';
import { SessionService } from '../../src/services/SessionService';
import { InvitationService } from '../../src/services/InvitationService';
import type { KVNamespace } from '@cloudflare/workers-types';
import * as schema from '../../../db/src/schema';
import { eq } from 'drizzle-orm';
import { getTestDb, cleanupDb, createMockUser } from '../utils/test-helpers.ts';
import type { NewUser } from '../../../db/src/schema';

const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn()
} as unknown as KVNamespace;

// Test suites
describe('UserService', () => {
  let userService: UserService;
  let testDb: any;

  beforeEach(async () => {
    const testContext = await getTestDb();
    testDb = testContext.db;
    userService = new UserService(testDb);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await cleanupDb();
  });

  test('should create a new user', async () => {
    const newUser: Partial<NewUser> = {
      telegramId: '12345',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      languageCode: 'en',
    };

    const result = await userService.createUser(newUser);

    expect(result).toBeDefined();
    expect(result.telegramId).toBe(newUser.telegramId);
    expect(result.firstName).toBe(newUser.firstName);
    expect(result.username).toBe(newUser.username);

    const dbUser = await testDb.query.users.findFirst({
      where: (users, { eq }) => eq(users.telegramId, newUser.telegramId!),
    });
    
    expect(dbUser).toBeDefined();
    expect(dbUser!.id).toBe(result.id);
  });

  test('should find user by telegram ID', async () => {
    const mockUser = createMockUser({ telegramId: '12345' });
    await testDb.insert(schema.users).values(mockUser);

    const result = await userService.findUserByTelegramId('12345');

    expect(result).toBeDefined();
    expect(result!.telegramId).toBe('12345');
    expect(result!.id).toBe(mockUser.id);
  });

  test('should return undefined for non-existent user', async () => {
    const result = await userService.findUserByTelegramId('99999');
    expect(result).toBeNull();
  });

  test('should update user information', async () => {
    const mockUser = createMockUser({ id: 1, telegramId: '54321' });
    await testDb.insert(schema.users).values(mockUser);
    
    const updates = { firstName: 'Jane', role: 'pro' as const };
    const result = await userService.updateUser(mockUser.id!, updates);

    expect(result).toBeDefined();
    expect(result!.firstName).toBe('Jane');
    expect(result!.role).toBe('pro');

    const dbUser = await testDb.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, mockUser.id!),
    });

    expect(dbUser).toBeDefined();
    expect(dbUser!.firstName).toBe('Jane');
    expect(dbUser!.role).toBe('pro');
  });
});

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockUser = createMockUser();

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
      userId: String(mockUser.id),
      telegramId: mockUser.telegramId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true
    };

    mockKV.get = vi.fn()
      .mockResolvedValueOnce(sessionId) // telegram mapping
      .mockResolvedValueOnce(JSON.stringify(sessionData)); // session data

    const result = await sessionService.getSessionByTelegramId(mockUser.telegramId!);

    expect(result).toBeTruthy();
    expect(result?.userId).toBe(String(mockUser.id));
  });

  test('should return null for expired session', async () => {
    const sessionId = 'test-session-id';
    const expiredSessionData = {
      id: sessionId,
      sessionId,
      userId: String(mockUser.id),
      telegramId: mockUser.telegramId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 1000), // expired
      isActive: true
    };

    mockKV.get = vi.fn()
      .mockResolvedValueOnce(sessionId)
      .mockResolvedValueOnce(JSON.stringify(expiredSessionData));
    mockKV.delete = vi.fn().mockResolvedValue(undefined);

    const result = await sessionService.getSessionByTelegramId(mockUser.telegramId!);

    expect(result).toBeNull();
    expect(mockKV.delete).toHaveBeenCalled();
  });
});

describe('InvitationService', () => {
  let invitationService: InvitationService;
  let testDb: any;

  beforeEach(async () => {
    const testContext = await getTestDb();
    testDb = testContext.db;
    invitationService = new InvitationService(testDb);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await cleanupDb();
  });

  test('should validate invitation code', async () => {
    const mockInvitation = {
      code: 'TEST123',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      maxUses: 10,
      currentUses: 0,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
    };
    await testDb.insert(schema.invitationCodes).values(mockInvitation);

    const result = await invitationService.validateInvitationCode('TEST123');

    expect(result).toBeDefined();
    expect(result.code).toBe(mockInvitation.code);
  });

  test('should throw for non-existent code', async () => {
    await expect(invitationService.validateInvitationCode('BOGUSCODE'))
      .rejects.toThrow('Invalid or inactive invitation code');
  });
  
  test('should throw for expired code', async () => {
    const mockInvitation = {
      code: 'EXPIRED',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() - 86400000), // expired 24 hours ago
      maxUses: 10,
      currentUses: 0,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
    };
    await testDb.insert(schema.invitationCodes).values(mockInvitation);
    
    await expect(invitationService.validateInvitationCode('EXPIRED'))
      .rejects.toThrow('Invitation code has expired');
  });

  test('should throw for code with no uses left', async () => {
    const mockInvitation = {
      code: 'MAXEDOUT',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: 10,
      currentUses: 10,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
    };
    await testDb.insert(schema.invitationCodes).values(mockInvitation);
    
    await expect(invitationService.validateInvitationCode('MAXEDOUT'))
      .rejects.toThrow('Invitation code has reached maximum uses');
  });
  
  test('should throw for inactive code', async () => {
    const mockInvitation = {
      code: 'INACTIVE',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: 10,
      currentUses: 0,
      purpose: 'beta_access',
      isActive: false,
      createdAt: new Date(),
    };
    await testDb.insert(schema.invitationCodes).values(mockInvitation);
    
    await expect(invitationService.validateInvitationCode('INACTIVE'))
      .rejects.toThrow('Invalid or inactive invitation code');
  });

  test('should successfully use an invitation code', async () => {
    const mockUser = createMockUser({id: 1, telegramId: 'user-1-tg'});
    const mockInvitation = {
      code: 'GOODCODE',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: 10,
      currentUses: 5,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
    };
    await testDb.insert(schema.users).values(mockUser);
    await testDb.insert(schema.invitationCodes).values(mockInvitation);

    console.log('=== BEFORE USING INVITATION CODE ===');
    const beforeCode = await testDb.query.invitationCodes.findFirst({where: (codes, {eq}) => eq(codes.code, 'GOODCODE')});
    console.log('Before using code - currentUses:', beforeCode?.currentUses);
    
    console.log('=== USING INVITATION CODE ===');
    const result = await invitationService.useInvitationCode('GOODCODE', String(mockUser.id), Number(mockUser.telegramId));
    console.log('Service result - id:', result?.id);
    
    expect(result).toBeDefined();
    
    console.log('=== AFTER USING INVITATION CODE ===');
    const updatedCode = await testDb.query.invitationCodes.findFirst({where: (codes, {eq}) => eq(codes.code, 'GOODCODE')});
    console.log('After using code, currentUses:', updatedCode?.currentUses);
    console.log('After using code, full object:', JSON.stringify(updatedCode, null, 2));
    
    // Let's also check all invitation codes to see what's in the table
    const allCodes = await testDb.select().from(schema.invitationCodes);
    console.log('All invitation codes count:', allCodes.length);
    console.log('All codes:', JSON.stringify(allCodes, null, 2));
    
    expect(updatedCode!.currentUses).toBe(6);
    
    const usageRecord = await testDb.query.invitationUsage.findFirst({where: (usage, {eq}) => eq(usage.userId, String(mockUser.id))});
    expect(usageRecord).toBeDefined();
    expect(usageRecord!.invitationId).toBe(mockInvitation.code);
  });

  test('should fail to use an invalid code', async () => {
    const mockUser = createMockUser({id: 2, telegramId: 'user-2-tg'});
    await testDb.insert(schema.users).values(mockUser);
    
    await expect(invitationService.useInvitationCode('BOGUSCODE', String(mockUser.id), Number(mockUser.telegramId)))
      .rejects.toThrow('Invalid or inactive invitation code');
  });
  
  test('should test direct update operation', async () => {
    console.log('=== TEST: Starting direct update test ===');
    
    const mockInvitation = {
      code: 'TESTUPDATE',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: 10,
      currentUses: 1,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
    };
    await testDb.insert(schema.invitationCodes).values(mockInvitation);
    
    console.log('=== TEST: Inserted test data ===');
    
    // Test direct update
    console.log('=== TEST: About to call update ===');
    await testDb.update(schema.invitationCodes)
      .set({ currentUses: 5 })
      .where(eq(schema.invitationCodes.code, 'TESTUPDATE'))
      .execute();
    
    console.log('=== TEST: Update completed ===');
    
    // Check if update worked
    const updatedCode = await testDb.select().from(schema.invitationCodes)
      .where(eq(schema.invitationCodes.code, 'TESTUPDATE'));
    
    console.log('=== TEST: Retrieved updated code:', JSON.stringify(updatedCode, null, 2));
    
    expect(updatedCode[0].currentUses).toBe(5);
  });

  test('should prevent a user from using a code twice', async () => {
     const mockUser = createMockUser({id: 3, telegramId: 'user-3-tg'});
     const mockInvitation = {
      code: 'ONCEONLY',
      createdBy: 'admin',
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: 10,
      currentUses: 1,
      purpose: 'beta_access',
      isActive: true,
      createdAt: new Date(),
    };
    await testDb.insert(schema.invitationCodes).values(mockInvitation);
    await testDb.insert(schema.users).values(mockUser);
    
    // First use
    await invitationService.useInvitationCode('ONCEONLY', String(mockUser.id), Number(mockUser.telegramId));
    
    // Check after first use
    const afterFirstUse = await testDb.select().from(schema.invitationCodes);
    const codeAfterFirst = afterFirstUse.find(code => code.code === 'ONCEONLY');

    // Second use should fail
    await expect(invitationService.useInvitationCode('ONCEONLY', String(mockUser.id), Number(mockUser.telegramId)))
        .rejects.toThrow('User has already used an invitation code');
    
    // Check the final state
    const allCodes = await testDb.select().from(schema.invitationCodes);
    const updatedCode = allCodes.find(code => code.code === 'ONCEONLY');
    
    expect(updatedCode).toBeDefined();
    // The currentUses should be incremented from 1 to 2 after the first successful use
    // The second use should fail before incrementing, so it should still be 2
    expect(updatedCode!.currentUses).toBe(2);
  });
});

// Keep the combined service tests for high-level workflows if needed,
// but ensure they are also refactored to use the real db.
describe('Combined Service Workflows', () => {
  let userService: UserService;
  let sessionService: SessionService;
  let testDb: any;

  beforeEach(async () => {
    const testContext = await getTestDb();
    testDb = testContext.db;
    userService = new UserService(testDb);
    sessionService = new SessionService(mockKV, 3600);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await cleanupDb();
  });

  test('should handle user creation and session creation flow', async () => {
    const newUser: Partial<NewUser> = {
      telegramId: '12345',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      languageCode: 'en',
    };
    
    mockKV.put = vi.fn().mockResolvedValue(undefined);

    // Create user via the service, not direct db insertion
    const user = await userService.createUser(newUser);
    expect(user).toBeDefined();
    expect(user.telegramId).toBe(newUser.telegramId);
    expect(user.firstName).toBe(newUser.firstName);
    expect(user.username).toBe(newUser.username);

    // Create session for user
    const session = await sessionService.createSession(user);
    expect(session.userId).toBe(user.id);
    expect(mockKV.put).toHaveBeenCalled();
  });
});