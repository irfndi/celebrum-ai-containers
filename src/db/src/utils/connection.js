import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../schema/index';
/**
 * Create database connection for Cloudflare Worker
 * @param d1Database - D1Database instance from Cloudflare Worker env
 * @returns Drizzle database instance with schema
 */
export function createDb(d1Database) {
    return drizzle(d1Database, { schema });
}
/**
 * Database connection factory for different environments
 * @param env - Cloudflare Worker environment
 * @returns Database instance
 */
export function getDatabase(env) {
    return createDb(env.ArbEdgeD1);
}
/**
 * Type-safe database transaction wrapper
 * @param db - Database instance
 * @param fn - Transaction function
 * @returns Promise with transaction result
 */
export async function withTransaction(db, fn) {
    return await db.transaction(fn);
}
//# sourceMappingURL=connection.js.map