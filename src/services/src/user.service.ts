import { type NewUser, users } from '../../db/src/schema';
import type { Database } from '../../db/src/utils/connection';

/**
 * Upserts a user in the database.
 * If the user already exists (based on telegramId), it updates the existing record.
 * If the user doesn't exist, it creates a new record.
 *
 * @param db - The database instance to use for the operation
 * @param userData - The user data to upsert
 * @returns Promise resolving to the upserted user data
 */
export async function upsertUser(db: Database, userData: NewUser) {
  return await db
    .insert(users)
    .values(userData)
    .onConflictDoUpdate({
      target: users.telegramId,
      set: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        languageCode: userData.languageCode,
        updatedAt: new Date(),
      },
    })
    .returning();
}