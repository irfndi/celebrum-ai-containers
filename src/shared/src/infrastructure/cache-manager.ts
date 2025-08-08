/**
 * Cache management utilities for Cloudflare KV and other storage backends
 */

import type { KVNamespace } from '@cloudflare/workers-types';

export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl?: number;
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
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
export abstract class CacheBackend {
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
export class CloudflareKVBackend extends CacheBackend {
  constructor(private kv: KVNamespace) {
    super();
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'json');
      return value as T;
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const kvOptions: Record<string, unknown> = {};
      
      if (options?.ttl) {
        kvOptions.expirationTtl = options.ttl;
      }
      
      if (options?.metadata) {
        kvOptions.metadata = options.metadata;
      }

      await this.kv.put(key, JSON.stringify(value), kvOptions);
    } catch (error) {
      console.error(`KV set error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.kv.delete(key);
      return true;
    } catch (error) {
      console.error(`KV delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.kv.get(key);
      return value !== null;
    } catch (error) {
      console.error(`KV exists error for key ${key}:`, error);
      return false;
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      let deleted = 0;
      
      for (const key of keys) {
        if (await this.delete(key)) {
          deleted++;
        }
      }
      
      return deleted;
    } catch (error) {
      console.error('KV clear error:', error);
      return 0;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const listOptions: Record<string, unknown> = {};
      if (pattern) {
        listOptions.prefix = pattern;
      }
      
      const result = await this.kv.list(listOptions);
      return result.keys.map(key => key.name);
    } catch (error) {
      console.error('KV keys error:', error);
      return [];
    }
  }
}

/**
 * In-memory cache backend for development/testing
 */
export class MemoryBackend extends CacheBackend {
  private cache = new Map<string, { value: unknown; expires?: number; metadata?: Record<string, unknown> }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const entry: { value: T; expires?: number; metadata?: Record<string, unknown> } = { value };
    
    if (options?.ttl) {
      entry.expires = Date.now() + (options.ttl * 1000);
    }
    
    if (options?.metadata) {
      entry.metadata = options.metadata;
    }
    
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
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

  async clear(pattern?: string): Promise<number> {
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

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return keys;
    }
    
    return keys.filter(key => key.startsWith(pattern));
  }
}

/**
 * Main cache manager with multiple backends and advanced features
 */
export class CacheManager {
  private backend: CacheBackend;
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(backend: CacheBackend, config?: Partial<CacheConfig>) {
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
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const normalizedKey = this.normalizeKey(key);
      const value = await this.backend.get<T>(normalizedKey);
      
      if (this.config.enableStats) {
        if (value !== null) {
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
        this.updateHitRate();
      }
      
      return value;
    } catch (error) {
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
  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
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
    } catch (error) {
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
  async delete(key: string): Promise<boolean> {
    try {
      const normalizedKey = this.normalizeKey(key);
      const result = await this.backend.delete(normalizedKey);
      
      if (this.config.enableStats && result) {
        this.stats.deletes++;
      }
      
      return result;
    } catch (error) {
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
  async exists(key: string): Promise<boolean> {
    try {
      const normalizedKey = this.normalizeKey(key);
      return await this.backend.exists(normalizedKey);
    } catch (error) {
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
  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await factory();
      await this.set(key, value, options);
    }
    
    return value;
  }

  /**
   * Set multiple values at once
   */
  async setMany<T = unknown>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    const promises = entries.map(({ key, value, options }) => this.set(key, value, options));
    await Promise.all(promises);
  }

  /**
   * Get multiple values at once
   */
  async getMany<T = unknown>(keys: string[]): Promise<Array<{ key: string; value: T | null }>> {
    const promises = keys.map(async (key) => ({
      key,
      value: await this.get<T>(key),
    }));
    
    return Promise.all(promises);
  }

  /**
   * Delete multiple keys at once
   */
  async deleteMany(keys: string[]): Promise<number> {
    const promises = keys.map(key => this.delete(key));
    const results = await Promise.all(promises);
    return results.filter(Boolean).length;
  }

  /**
   * Clear cache with optional pattern
   */
  async clear(pattern?: string): Promise<number> {
    try {
      const normalizedPattern = pattern ? this.normalizeKey(pattern) : undefined;
      return await this.backend.clear(normalizedPattern);
    } catch (error) {
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
  async keys(pattern?: string): Promise<string[]> {
    try {
      const normalizedPattern = pattern ? this.normalizeKey(pattern) : undefined;
      const keys = await this.backend.keys(normalizedPattern);
      
      // Remove prefix if it was added
      if (this.config.keyPrefix) {
        return keys.map(key => key.replace(this.config.keyPrefix!, ''));
      }
      
      return keys;
    } catch (error) {
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
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
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
  private normalizeKey(key: string): string {
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
  private validateKey(key: string): void {
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
  private validateValue(value: unknown): void {
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
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Cache decorator for methods
 */
export function cached(options?: {
  ttl?: number;
  keyGenerator?: (...args: unknown[]) => string;
  cacheManager?: CacheManager;
}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const cacheManager = options?.cacheManager || globalCacheManager;
      
      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }
      
      // Generate cache key
      const key = options?.keyGenerator 
        ? options.keyGenerator(...args)
        : `${(target as unknown as { constructor: { name: string } }).constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      
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
let globalCacheManager: CacheManager | null = null;

/**
 * Initialize global cache manager
 */
export function initializeCacheManager(backend: CacheBackend, config?: Partial<CacheConfig>): CacheManager {
  globalCacheManager = new CacheManager(backend, config);
  return globalCacheManager;
}

/**
 * Get global cache manager
 */
export function getCacheManager(): CacheManager | null {
  return globalCacheManager;
}

/**
 * Create cache manager with Cloudflare KV
 */
export function createKVCacheManager(kv: KVNamespace, config?: Partial<CacheConfig>): CacheManager {
  const backend = new CloudflareKVBackend(kv);
  return new CacheManager(backend, config);
}

/**
 * Create cache manager with memory backend
 */
export function createMemoryCacheManager(config?: Partial<CacheConfig>): CacheManager {
  const backend = new MemoryBackend();
  return new CacheManager(backend, config);
}

// Export types and classes
export { CacheManager as default };