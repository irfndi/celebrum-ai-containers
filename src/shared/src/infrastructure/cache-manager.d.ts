/**
 * Cache management utilities for Cloudflare KV and other storage backends
 */
export interface CacheEntry<T = unknown> {
    value: T;
    timestamp: number;
    ttl?: number;
    metadata?: Record<string, unknown>;
}
export interface CacheOptions {
    ttl?: number;
    namespace?: string;
    compress?: boolean;
    metadata?: Record<string, unknown>;
}
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    hitRate: number;
}
export interface CacheConfig {
    defaultTtl: number;
    maxKeyLength: number;
    maxValueSize: number;
    compressionThreshold: number;
    enableStats: boolean;
    keyPrefix?: string;
}
/**
 * Abstract cache interface for different storage backends
 */
export declare abstract class CacheBackend {
    abstract get<T = unknown>(key: string): Promise<T | null>;
    abstract set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
    abstract delete(key: string): Promise<boolean>;
    abstract exists(key: string): Promise<boolean>;
    abstract clear(pattern?: string): Promise<number>;
    abstract keys(pattern?: string): Promise<string[]>;
}
/**
 * Cloudflare KV cache backend
 */
export declare class CloudflareKVBackend extends CacheBackend {
    private kv;
    constructor(kv: KVNamespace);
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    clear(pattern?: string): Promise<number>;
    keys(pattern?: string): Promise<string[]>;
}
/**
 * In-memory cache backend for development/testing
 */
export declare class MemoryBackend extends CacheBackend {
    private cache;
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    clear(pattern?: string): Promise<number>;
    keys(pattern?: string): Promise<string[]>;
}
/**
 * Main cache manager with multiple backends and advanced features
 */
export declare class CacheManager {
    private backend;
    private config;
    private stats;
    constructor(backend: CacheBackend, config?: Partial<CacheConfig>);
    /**
     * Get a value from cache
     */
    get<T = unknown>(key: string): Promise<T | null>;
    /**
     * Set a value in cache
     */
    set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Check if a key exists in cache
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get or set a value (cache-aside pattern)
     */
    getOrSet<T = unknown>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Set multiple values at once
     */
    setMany<T = unknown>(entries: Array<{
        key: string;
        value: T;
        options?: CacheOptions;
    }>): Promise<void>;
    /**
     * Get multiple values at once
     */
    getMany<T = unknown>(keys: string[]): Promise<Array<{
        key: string;
        value: T | null;
    }>>;
    /**
     * Delete multiple keys at once
     */
    deleteMany(keys: string[]): Promise<number>;
    /**
     * Clear cache with optional pattern
     */
    clear(pattern?: string): Promise<number>;
    /**
     * Get all keys with optional pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset cache statistics
     */
    resetStats(): void;
    /**
     * Normalize cache key
     */
    private normalizeKey;
    /**
     * Validate cache key
     */
    private validateKey;
    /**
     * Validate cache value
     */
    private validateValue;
    /**
     * Update hit rate statistics
     */
    private updateHitRate;
}
/**
 * Cache decorator for methods
 */
export declare function cached(options?: {
    ttl?: number;
    keyGenerator?: (...args: unknown[]) => string;
    cacheManager?: CacheManager;
}): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Initialize global cache manager
 */
export declare function initializeCacheManager(backend: CacheBackend, config?: Partial<CacheConfig>): CacheManager;
/**
 * Get global cache manager
 */
export declare function getCacheManager(): CacheManager | null;
/**
 * Create cache manager with Cloudflare KV
 */
export declare function createKVCacheManager(kv: KVNamespace, config?: Partial<CacheConfig>): CacheManager;
/**
 * Create cache manager with memory backend
 */
export declare function createMemoryCacheManager(config?: Partial<CacheConfig>): CacheManager;
export { CacheManager as default };
//# sourceMappingURL=cache-manager.d.ts.map