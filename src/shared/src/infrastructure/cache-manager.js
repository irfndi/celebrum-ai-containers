"use strict";
/**
 * Cache management utilities for Cloudflare KV and other storage backends
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.CacheManager = exports.MemoryBackend = exports.CloudflareKVBackend = exports.CacheBackend = void 0;
exports.cached = cached;
exports.initializeCacheManager = initializeCacheManager;
exports.getCacheManager = getCacheManager;
exports.createKVCacheManager = createKVCacheManager;
exports.createMemoryCacheManager = createMemoryCacheManager;
/**
 * Abstract cache interface for different storage backends
 */
class CacheBackend {
}
exports.CacheBackend = CacheBackend;
/**
 * Cloudflare KV cache backend
 */
class CloudflareKVBackend extends CacheBackend {
    kv;
    constructor(kv) {
        super();
        this.kv = kv;
    }
    async get(key) {
        try {
            const value = await this.kv.get(key, 'json');
            return value;
        }
        catch (error) {
            console.error(`KV get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, options) {
        try {
            const kvOptions = {};
            if (options?.ttl) {
                kvOptions.expirationTtl = options.ttl;
            }
            if (options?.metadata) {
                kvOptions.metadata = options.metadata;
            }
            await this.kv.put(key, JSON.stringify(value), kvOptions);
        }
        catch (error) {
            console.error(`KV set error for key ${key}:`, error);
            throw error;
        }
    }
    async delete(key) {
        try {
            await this.kv.delete(key);
            return true;
        }
        catch (error) {
            console.error(`KV delete error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            const value = await this.kv.get(key);
            return value !== null;
        }
        catch (error) {
            console.error(`KV exists error for key ${key}:`, error);
            return false;
        }
    }
    async clear(pattern) {
        try {
            const keys = await this.keys(pattern);
            let deleted = 0;
            for (const key of keys) {
                if (await this.delete(key)) {
                    deleted++;
                }
            }
            return deleted;
        }
        catch (error) {
            console.error('KV clear error:', error);
            return 0;
        }
    }
    async keys(pattern) {
        try {
            const listOptions = {};
            if (pattern) {
                listOptions.prefix = pattern;
            }
            const result = await this.kv.list(listOptions);
            return result.keys.map(key => key.name);
        }
        catch (error) {
            console.error('KV keys error:', error);
            return [];
        }
    }
}
exports.CloudflareKVBackend = CloudflareKVBackend;
/**
 * In-memory cache backend for development/testing
 */
class MemoryBackend extends CacheBackend {
    cache = new Map();
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        // Check if expired
        if (entry.expires && Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, options) {
        const entry = { value };
        if (options?.ttl) {
            entry.expires = Date.now() + (options.ttl * 1000);
        }
        if (options?.metadata) {
            entry.metadata = options.metadata;
        }
        this.cache.set(key, entry);
    }
    async delete(key) {
        return this.cache.delete(key);
    }
    async exists(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        // Check if expired
        if (entry.expires && Date.now() > entry.expires) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    async clear(pattern) {
        if (!pattern) {
            const size = this.cache.size;
            this.cache.clear();
            return size;
        }
        let deleted = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(pattern)) {
                this.cache.delete(key);
                deleted++;
            }
        }
        return deleted;
    }
    async keys(pattern) {
        const keys = Array.from(this.cache.keys());
        if (!pattern) {
            return keys;
        }
        return keys.filter(key => key.startsWith(pattern));
    }
}
exports.MemoryBackend = MemoryBackend;
/**
 * Main cache manager with multiple backends and advanced features
 */
class CacheManager {
    backend;
    config;
    stats;
    constructor(backend, config) {
        this.backend = backend;
        this.config = {
            defaultTtl: 3600, // 1 hour
            maxKeyLength: 512,
            maxValueSize: 25 * 1024 * 1024, // 25MB
            compressionThreshold: 1024, // 1KB
            enableStats: true,
            ...config,
        };
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            hitRate: 0,
        };
    }
    /**
     * Get a value from cache
     */
    async get(key) {
        try {
            const normalizedKey = this.normalizeKey(key);
            const value = await this.backend.get(normalizedKey);
            if (this.config.enableStats) {
                if (value !== null) {
                    this.stats.hits++;
                }
                else {
                    this.stats.misses++;
                }
                this.updateHitRate();
            }
            return value;
        }
        catch (error) {
            if (this.config.enableStats) {
                this.stats.errors++;
            }
            console.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    /**
     * Set a value in cache
     */
    async set(key, value, options) {
        try {
            this.validateKey(key);
            this.validateValue(value);
            const normalizedKey = this.normalizeKey(key);
            const finalOptions = {
                ttl: this.config.defaultTtl,
                ...options,
            };
            await this.backend.set(normalizedKey, value, finalOptions);
            if (this.config.enableStats) {
                this.stats.sets++;
            }
        }
        catch (error) {
            if (this.config.enableStats) {
                this.stats.errors++;
            }
            console.error(`Cache set error for key ${key}:`, error);
            throw error;
        }
    }
    /**
     * Delete a value from cache
     */
    async delete(key) {
        try {
            const normalizedKey = this.normalizeKey(key);
            const result = await this.backend.delete(normalizedKey);
            if (this.config.enableStats && result) {
                this.stats.deletes++;
            }
            return result;
        }
        catch (error) {
            if (this.config.enableStats) {
                this.stats.errors++;
            }
            console.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Check if a key exists in cache
     */
    async exists(key) {
        try {
            const normalizedKey = this.normalizeKey(key);
            return await this.backend.exists(normalizedKey);
        }
        catch (error) {
            if (this.config.enableStats) {
                this.stats.errors++;
            }
            console.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Get or set a value (cache-aside pattern)
     */
    async getOrSet(key, factory, options) {
        let value = await this.get(key);
        if (value === null) {
            value = await factory();
            await this.set(key, value, options);
        }
        return value;
    }
    /**
     * Set multiple values at once
     */
    async setMany(entries) {
        const promises = entries.map(({ key, value, options }) => this.set(key, value, options));
        await Promise.all(promises);
    }
    /**
     * Get multiple values at once
     */
    async getMany(keys) {
        const promises = keys.map(async (key) => ({
            key,
            value: await this.get(key),
        }));
        return Promise.all(promises);
    }
    /**
     * Delete multiple keys at once
     */
    async deleteMany(keys) {
        const promises = keys.map(key => this.delete(key));
        const results = await Promise.all(promises);
        return results.filter(Boolean).length;
    }
    /**
     * Clear cache with optional pattern
     */
    async clear(pattern) {
        try {
            const normalizedPattern = pattern ? this.normalizeKey(pattern) : undefined;
            return await this.backend.clear(normalizedPattern);
        }
        catch (error) {
            if (this.config.enableStats) {
                this.stats.errors++;
            }
            console.error('Cache clear error:', error);
            return 0;
        }
    }
    /**
     * Get all keys with optional pattern
     */
    async keys(pattern) {
        try {
            const normalizedPattern = pattern ? this.normalizeKey(pattern) : undefined;
            const keys = await this.backend.keys(normalizedPattern);
            // Remove prefix if it was added
            if (this.config.keyPrefix) {
                return keys.map(key => key.replace(this.config.keyPrefix, ''));
            }
            return keys;
        }
        catch (error) {
            if (this.config.enableStats) {
                this.stats.errors++;
            }
            console.error('Cache keys error:', error);
            return [];
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset cache statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            hitRate: 0,
        };
    }
    /**
     * Normalize cache key
     */
    normalizeKey(key) {
        let normalizedKey = key;
        // Add prefix if configured
        if (this.config.keyPrefix) {
            normalizedKey = `${this.config.keyPrefix}${normalizedKey}`;
        }
        return normalizedKey;
    }
    /**
     * Validate cache key
     */
    validateKey(key) {
        if (!key || typeof key !== 'string') {
            throw new Error('Cache key must be a non-empty string');
        }
        if (key.length > this.config.maxKeyLength) {
            throw new Error(`Cache key length exceeds maximum of ${this.config.maxKeyLength} characters`);
        }
    }
    /**
     * Validate cache value
     */
    validateValue(value) {
        if (value === undefined) {
            throw new Error('Cache value cannot be undefined');
        }
        const serialized = JSON.stringify(value);
        if (serialized.length > this.config.maxValueSize) {
            throw new Error(`Cache value size exceeds maximum of ${this.config.maxValueSize} bytes`);
        }
    }
    /**
     * Update hit rate statistics
     */
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
}
exports.CacheManager = CacheManager;
exports.default = CacheManager;
/**
 * Cache decorator for methods
 */
function cached(options) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const cacheManager = options?.cacheManager || globalCacheManager;
            if (!cacheManager) {
                return originalMethod.apply(this, args);
            }
            // Generate cache key
            const key = options?.keyGenerator
                ? options.keyGenerator(...args)
                : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
            // Try to get from cache
            const cached = await cacheManager.get(key);
            if (cached !== null) {
                return cached;
            }
            // Execute original method and cache result
            const result = await originalMethod.apply(this, args);
            await cacheManager.set(key, result, { ttl: options?.ttl });
            return result;
        };
        return descriptor;
    };
}
// Global cache manager instance
let globalCacheManager = null;
/**
 * Initialize global cache manager
 */
function initializeCacheManager(backend, config) {
    globalCacheManager = new CacheManager(backend, config);
    return globalCacheManager;
}
/**
 * Get global cache manager
 */
function getCacheManager() {
    return globalCacheManager;
}
/**
 * Create cache manager with Cloudflare KV
 */
function createKVCacheManager(kv, config) {
    const backend = new CloudflareKVBackend(kv);
    return new CacheManager(backend, config);
}
/**
 * Create cache manager with memory backend
 */
function createMemoryCacheManager(config) {
    const backend = new MemoryBackend();
    return new CacheManager(backend, config);
}
//# sourceMappingURL=cache-manager.js.map