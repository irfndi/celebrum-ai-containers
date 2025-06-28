import type { Env } from '../types';
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (c: unknown) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    message?: string;
}
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
    retryAfter?: number;
}
/**
 * RateLimiter provides request rate limiting using Cloudflare KV
 */
export declare class RateLimiter {
    private config;
    constructor(config: RateLimitConfig);
    /**
     * Rate limiting middleware
     */
    middleware(): (c: unknown, next: () => Promise<void>) => Promise<Response | undefined>;
    /**
     * Check current rate limit status
     */
    private checkRateLimit;
    /**
     * Increment rate limit counter
     */
    private incrementCounter;
    /**
     * Default key generator using IP address
     */
    private defaultKeyGenerator;
    /**
     * Get client identifier (IP address)
     */
    private getClientId;
    /**
     * Create rate limit exceeded response
     */
    private createRateLimitResponse;
    /**
     * Reset rate limit for a specific key
     */
    reset(env: Env, key: string): Promise<void>;
    /**
     * Get current rate limit status for a key
     */
    getStatus(env: Env, key: string): Promise<RateLimitInfo>;
}
/**
 * Create a rate limiter with common configurations
 */
export declare function createRateLimiter(config: RateLimitConfig): RateLimiter;
/**
 * Predefined rate limiters for common use cases
 */
export declare const rateLimiters: {
    /**
     * Strict rate limiter: 10 requests per minute
     */
    strict: RateLimiter;
    /**
     * Moderate rate limiter: 100 requests per minute
     */
    moderate: RateLimiter;
    /**
     * Lenient rate limiter: 1000 requests per minute
     */
    lenient: RateLimiter;
    /**
     * API rate limiter: 1000 requests per hour
     */
    api: RateLimiter;
    /**
     * Auth rate limiter: 5 attempts per 15 minutes
     */
    auth: RateLimiter;
};
//# sourceMappingURL=rate-limit.d.ts.map