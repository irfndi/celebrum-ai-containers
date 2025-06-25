// Cache management for performance optimization

import type { Env } from '@celebrum-ai/shared';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  constructor(private env: Env) {}

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.env.CELEBRUM_KV?.get(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if cache entry has expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T = any>(key: string, data: T, ttlSeconds: number = 3600): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000,
      };

      await this.env.CELEBRUM_KV?.put(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.env.CELEBRUM_KV?.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        // List all keys with prefix and delete them
        const keys = await this.env.CELEBRUM_KV?.list({ prefix });
        if (keys?.keys) {
          for (const key of keys.keys) {
            await this.delete(key.name);
          }
        }
      } else {
        // Clear all cache entries (use with caution)
        const keys = await this.env.CELEBRUM_KV?.list();
        if (keys?.keys) {
          for (const key of keys.keys) {
            await this.delete(key.name);
          }
        }
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      // Fetch fresh data
      const data = await fetcher();
      
      // Store in cache
      await this.set(key, data, ttlSeconds);
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      return null;
    }
  }
}