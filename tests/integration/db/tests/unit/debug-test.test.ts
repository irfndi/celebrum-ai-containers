/**
 * Debug test to isolate the database issue
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../../src/db/src/schema';
import { UserQueries } from '../../../../src/db/src/utils/queries';

describe('Debug Database Test', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userQueries: UserQueries;

  beforeEach(async () => {
    // Initialize database connection
    db = drizzle(env.DB, { schema });
    userQueries = new UserQueries(db);
  });

  it('should create a simple user', async () => {
    console.log('Starting user creation test...');
    
    const simpleUser = {
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      role: 'free' as const,
      status: 'active' as const,
    };
    
    console.log('About to call userQueries.create...');
    const result = await userQueries.create(simpleUser);
    console.log('User creation completed:', result);
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.telegramId).toBe(simpleUser.telegramId);
  });
});