import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeAll, afterAll } from 'vitest';

// This is an in-memory SQLite database instance for testing.
const sqlite = new Database(':memory:');
export const db = drizzle(sqlite);

beforeAll(() => {
  // Apply Drizzle migrations to the in-memory database before any tests run.
  migrate(db, { migrationsFolder: './src/db/migrations' });
});

afterAll(() => {
  // Close the database connection after all tests have run.
  sqlite.close();
}); 