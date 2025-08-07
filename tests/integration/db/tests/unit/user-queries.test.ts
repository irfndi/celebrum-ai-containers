/**
 * User queries test - Production ready tests for Cloudflare D1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../../src/db/src/schema';
import { UserQueries } from '../../../../src/db/src/utils/queries';

describe('User Queries', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userQueries: UserQueries;

  beforeEach(async () => {
    // Initialize database connection with schema
    db = drizzle(env.DB, { schema });
    userQueries = new UserQueries(db);
  });

  it('should create a user with Drizzle ORM', async () => {
    const user = {
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'free' as const,
      status: 'active' as const,
      settings: { theme: 'dark', notifications: true },
      apiLimits: { dailyRequests: 1000, rateLimit: 10 },
      tradingPreferences: { riskLevel: 'medium', autoTrade: false },
    };

    const result = await userQueries.create(user);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.telegramId).toBe(user.telegramId);
    expect(result.firstName).toBe(user.firstName);
    expect(result.lastName).toBe(user.lastName);
    expect(result.username).toBe(user.username);
    expect(result.role).toBe(user.role);
    expect(result.status).toBe(user.status);

    // Test JSON fields are properly handled
    expect(result.settings).toEqual(user.settings);
    expect(result.apiLimits).toEqual(user.apiLimits);
    expect(result.tradingPreferences).toEqual(user.tradingPreferences);

    // Test timestamps
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should find user by telegram ID', async () => {
    // First create a user
    const user = {
      telegramId: '987654321',
      firstName: 'Find',
      lastName: 'User',
      username: 'finduser',
      role: 'free' as const,
      status: 'active' as const,
      settings: { language: 'en' },
    };

    const createdUser = await userQueries.create(user);

    // Now find the user
    const foundUser = await userQueries.findByTelegramId(user.telegramId);

    expect(foundUser).toBeDefined();
    expect(foundUser?.telegramId).toBe(user.telegramId);
    expect(foundUser?.firstName).toBe(user.firstName);
    expect(foundUser?.settings).toEqual(user.settings);
  });

  it('should find user by ID', async () => {
    // First create a user
    const user = {
      telegramId: '123123123',
      firstName: 'Find',
      lastName: 'ById',
      username: 'findbyid',
      role: 'free' as const,
      status: 'active' as const,
    };

    const createdUser = await userQueries.create(user);

    // Now find the user by ID
    const foundUser = await userQueries.findById(createdUser.id);

    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(createdUser.id);
    expect(foundUser?.telegramId).toBe(user.telegramId);
    expect(foundUser?.firstName).toBe(user.firstName);
  });

  it('should update user data', async () => {
    // First create a user
    const user = {
      telegramId: '555555555',
      firstName: 'Update',
      lastName: 'Test',
      username: 'updatetest',
      role: 'free' as const,
      status: 'active' as const,
      settings: { theme: 'light' },
    };

    const createdUser = await userQueries.create(user);

    // Update the user
    const updates = {
      firstName: 'Updated',
      settings: { theme: 'dark', newFeature: true },
      apiLimits: { dailyRequests: 2000 },
    };

    const updatedUser = await userQueries.update(createdUser.id, updates);

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.firstName).toBe(updates.firstName);
    expect(updatedUser?.lastName).toBe(user.lastName); // Should remain unchanged
    expect(updatedUser?.settings).toEqual(updates.settings);
    expect(updatedUser?.apiLimits).toEqual(updates.apiLimits);
  });

  it('should handle user not found scenarios', async () => {
    const nonExistentId = 'user-nonexistent-123';
    const nonExistentTelegramId = '999999999';

    const userById = await userQueries.findById(nonExistentId);
    const userByTelegramId = await userQueries.findByTelegramId(nonExistentTelegramId);

    expect(userById).toBeNull();
    expect(userByTelegramId).toBeNull();
  });

  it('should delete a user', async () => {
    // First create a user
    const user = {
      telegramId: '777777777',
      firstName: 'Delete',
      lastName: 'Test',
      username: 'deletetest',
      role: 'free' as const,
      status: 'active' as const,
    };

    const createdUser = await userQueries.create(user);

    // Delete the user
    const deleteResult = await userQueries.delete(createdUser.id);
    expect(deleteResult).toBe(true);

    // Verify user is deleted
    const foundUser = await userQueries.findById(createdUser.id);
    expect(foundUser).toBeNull();
  });
});