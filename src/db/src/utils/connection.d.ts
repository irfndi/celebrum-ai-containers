import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../schema/index';
export type Database = DrizzleD1Database<typeof schema>;
export interface Env {
    ArbEdgeD1: D1Database;
}
/**
 * Create database connection for Cloudflare Worker
 * @param d1Database - D1Database instance from Cloudflare Worker env
 * @returns Drizzle database instance with schema
 */
export declare function createDb(d1Database: D1Database): Database;
/**
 * Database connection factory for different environments
 * @param env - Cloudflare Worker environment
 * @returns Database instance
 */
export declare function getDatabase(env: Env): Database;
/**
 * Type-safe database transaction wrapper
 * @param db - Database instance
 * @param fn - Transaction function
 * @returns Promise with transaction result
 */
export declare function withTransaction<T>(db: Database, fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>): Promise<T>;
//# sourceMappingURL=connection.d.ts.map