/**
 * Production-Ready Integration Tests for D1 Database
 *
 * These tests validate the database layer against a real D1 database,
 * ensuring that schemas, queries, and data integrity match production behavior.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { db } from '../../../../../tests/setup/setup-db-cloudflare';
import * as schema from '../../../../../src/db/src/schema';
import { eq } from 'drizzle-orm';

describe('D1 Database Integration Tests', () => {

  // Before each test, we can clean up specific tables if needed,
  // though the vitest-pool-workers integration provides isolation.
  beforeEach(async () => {
    // Clean the users table before each test to ensure a clean state
    await db.delete(schema.users);
    await db.delete(schema.userUsernameHistory);
  });

  test('should create a new user and verify its existence', async () => {
    const newUser = {
      id: 'test-user-1',
      telegramId: '12345',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'free' as const,
      status: 'active' as const,
    };

    // Insert a new user
    await db.insert(schema.users).values(newUser);

    // Retrieve the user from the database
    const fetchedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, 'test-user-1'),
    });

    // Assertions
    expect(fetchedUser).toBeDefined();
    expect(fetchedUser?.id).toBe(newUser.id);
    expect(fetchedUser?.telegramId).toBe(newUser.telegramId);
    expect(fetchedUser?.username).toBe(newUser.username);
  });

  test('should update an existing user and verify the changes', async () => {
    const initialUser = {
      id: 'test-user-2',
      telegramId: '67890',
      username: 'initial_username',
      status: 'active' as const,
    };
    await db.insert(schema.users).values(initialUser);

    const updatedUsername = 'updated_username';
    const updatedStatus = 'suspended';

    // Update the user's username and status
    await db.update(schema.users)
      .set({ username: updatedUsername, status: updatedStatus })
      .where(eq(schema.users.id, 'test-user-2'));

    // Retrieve the updated user
    const fetchedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, 'test-user-2'),
    });

    // Assertions
    expect(fetchedUser).toBeDefined();
    expect(fetchedUser?.username).toBe(updatedUsername);
    expect(fetchedUser?.status).toBe(updatedStatus);
  });

  test('should not allow creating a user with a duplicate telegram_id', async () => {
    const user1 = { id: 'user-dup-1', telegramId: '112233', username: 'user1' };
    await db.insert(schema.users).values(user1);

    const user2 = { id: 'user-dup-2', telegramId: '112233', username: 'user2' };

    // Expect an error when trying to insert a user with the same telegram_id
    await expect(db.insert(schema.users).values(user2)).rejects.toThrow();
  });
  
  test('should delete a user and verify its removal', async () => {
    const userToDelete = {
      id: 'user-to-delete',
      telegramId: '999888',
      username: 'delete_me',
    };
    await db.insert(schema.users).values(userToDelete);

    // Delete the user
    await db.delete(schema.users).where(eq(schema.users.id, 'user-to-delete'));

    // Try to retrieve the deleted user
    const fetchedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, 'user-to-delete'),
    });

    // Assertion
    expect(fetchedUser).toBeUndefined();
  });

  test('should handle foreign key constraints correctly for user_username_history', async () => {
    const user = {
      id: 'history-user',
      telegramId: '777666',
      username: 'history_user',
    };
    await db.insert(schema.users).values(user);

    const historyEntry = {
      userId: 'history-user',
      telegramId: '777666',
      username: 'old_username',
      changeSource: 'manual_correction' as const,
    };

    // This should succeed because the user exists
    await db.insert(schema.userUsernameHistory).values(historyEntry);

    // Verify the history entry was created
    const fetchedHistory = await db.query.userUsernameHistory.findFirst({
      where: eq(schema.userUsernameHistory.userId, 'history-user'),
    });
    expect(fetchedHistory).toBeDefined();
    expect(fetchedHistory?.username).toBe('old_username');

    // Now, delete the user and check if the history is cascaded
    await db.delete(schema.users).where(eq(schema.users.id, 'history-user'));

    const fetchedHistoryAfterDelete = await db.query.userUsernameHistory.findFirst({
        where: eq(schema.userUsernameHistory.userId, 'history-user'),
    });
    expect(fetchedHistoryAfterDelete).toBeUndefined();
  });
});