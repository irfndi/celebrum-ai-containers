// Export all database schemas and utilities
export * from './schema/index.js';
export * from './utils/connection.js';
export * from './utils/queries.js';
export * from './utils/invitation-queries.js';
export { UserQueries, UserUsernameHistoryQueries } from './utils/queries.js';
export { InvitationQueries } from './utils/invitation-queries.js';

// Re-export commonly used Drizzle types and functions
export { eq, and, or, not, sql, desc, asc, like, ilike } from 'drizzle-orm';
export type { SQL } from 'drizzle-orm';

// Package version
export const VERSION = '0.1.0';