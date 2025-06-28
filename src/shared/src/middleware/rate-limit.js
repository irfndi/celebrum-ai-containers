"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiters = exports.RateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
/**
 * RateLimiter provides request rate limiting using Cloudflare KV
 */
class RateLimiter {
    config;
    constructor(config) {
        this.config = {
            windowMs: config.windowMs,
            maxRequests: config.maxRequests,
            keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
            skipSuccessfulRequests: config.skipSuccessfulRequests || false,
            skipFailedRequests: config.skipFailedRequests || false,
            message: config.message || 'Too many requests, please try again later.'
        };
    }
    /**
     * Rate limiting middleware
     */
    middleware() {
        return async (c, next) => {
            const env = c.env;
            if (!env.CELEBRUM_KV) {
                console.warn('KV store not available, skipping rate limiting');
                await next();
                return;
            }
            const key = this.config.keyGenerator ? this.config.keyGenerator(c) : this.defaultKeyGenerator(c);
            const rateLimitInfo = await this.checkRateLimit(env, key);
            // Set rate limit headers
            const cWithHeader = c;
            cWithHeader.header('X-RateLimit-Limit', rateLimitInfo.limit.toString());
            cWithHeader.header('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
            cWithHeader.header('X-RateLimit-Reset', rateLimitInfo.reset.toString());
            if (rateLimitInfo.remaining < 0) {
                if (rateLimitInfo.retryAfter) {
                    cWithHeader.header('Retry-After', rateLimitInfo.retryAfter.toString());
                }
                return this.createRateLimitResponse(rateLimitInfo);
            }
            // Continue to next middleware
            await next();
            // Update rate limit counter (unless configured to skip)
            const cWithRes = c;
            const shouldSkip = ((this.config.skipSuccessfulRequests && cWithRes.res.status < 400) ||
                (this.config.skipFailedRequests && cWithRes.res.status >= 400));
            if (!shouldSkip) {
                await this.incrementCounter(env, key);
            }
        };
    }
    /**
     * Check current rate limit status
     */
    async checkRateLimit(env, key) {
        const now = Date.now();
        const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
        const windowEnd = windowStart + this.config.windowMs;
        const rateLimitKey = `ratelimit:${key}:${windowStart}`;
        try {
            const stored = await env.CELEBRUM_KV.get(rateLimitKey);
            const currentCount = stored ? parseInt(stored, 10) : 0;
            const remaining = Math.max(0, this.config.maxRequests - currentCount - 1);
            const retryAfter = remaining < 0 ? Math.ceil((windowEnd - now) / 1000) : undefined;
            return {
                limit: this.config.maxRequests,
                remaining,
                reset: Math.ceil(windowEnd / 1000),
                retryAfter
            };
        }
        catch (error) {
            console.error('Rate limit check error:', error);
            // On error, allow the request
            return {
                limit: this.config.maxRequests,
                remaining: this.config.maxRequests - 1,
                reset: Math.ceil(windowEnd / 1000)
            };
        }
    }
    /**
     * Increment rate limit counter
     */
    async incrementCounter(env, key) {
        const now = Date.now();
        const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
        const rateLimitKey = `ratelimit:${key}:${windowStart}`;
        const ttl = Math.ceil(this.config.windowMs / 1000) + 10; // Add 10 seconds buffer
        try {
            const stored = await env.CELEBRUM_KV.get(rateLimitKey);
            const currentCount = stored ? parseInt(stored, 10) : 0;
            const newCount = currentCount + 1;
            await env.CELEBRUM_KV.put(rateLimitKey, newCount.toString(), {
                expirationTtl: ttl
            });
        }
        catch (error) {
            console.error('Rate limit increment error:', error);
        }
    }
    /**
     * Default key generator using IP address
     */
    defaultKeyGenerator(c) {
        const ip = this.getClientId(c);
        return `ip:${ip}`;
    }
    /**
     * Get client identifier (IP address)
     */
    getClientId(c) {
        // Try various headers to get the real IP
        const headers = [
            'CF-Connecting-IP',
            'X-Forwarded-For',
            'X-Real-IP',
            'X-Client-IP'
        ];
        for (const header of headers) {
            const value = c.req.header(header);
            if (value) {
                // Handle comma-separated IPs (X-Forwarded-For can have multiple IPs)
                return value.split(',')[0].trim();
            }
        }
        // Fallback to a default identifier
        return 'unknown';
    }
    /**
     * Create rate limit exceeded response
     */
    createRateLimitResponse(rateLimitInfo) {
        const body = {
            error: 'Rate Limit Exceeded',
            message: this.config.message,
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            reset: rateLimitInfo.reset,
            retryAfter: rateLimitInfo.retryAfter
        };
        const headers = {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitInfo.reset.toString()
        };
        if (rateLimitInfo.retryAfter) {
            headers['Retry-After'] = rateLimitInfo.retryAfter.toString();
        }
        return new Response(JSON.stringify(body), {
            status: 429,
            headers
        });
    }
    /**
     * Reset rate limit for a specific key
     */
    async reset(env, key) {
        const now = Date.now();
        const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
        const rateLimitKey = `ratelimit:${key}:${windowStart}`;
        try {
            await env.CELEBRUM_KV.delete(rateLimitKey);
        }
        catch (error) {
            console.error('Rate limit reset error:', error);
        }
    }
    /**
     * Get current rate limit status for a key
     */
    async getStatus(env, key) {
        return this.checkRateLimit(env, key);
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Create a rate limiter with common configurations
 */
function createRateLimiter(config) {
    return new RateLimiter(config);
}
/**
 * Predefined rate limiters for common use cases
 */
exports.rateLimiters = {
    /**
     * Strict rate limiter: 10 requests per minute
     */
    strict: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
        message: 'Too many requests. Please try again in a minute.'
    }),
    /**
     * Moderate rate limiter: 100 requests per minute
     */
    moderate: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        message: 'Rate limit exceeded. Please slow down your requests.'
    }),
    /**
     * Lenient rate limiter: 1000 requests per minute
     */
    lenient: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 1000,
        message: 'Rate limit exceeded. Please try again shortly.'
    }),
    /**
     * API rate limiter: 1000 requests per hour
     */
    api: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000,
        message: 'API rate limit exceeded. Please try again in an hour.'
    }),
    /**
     * Auth rate limiter: 5 attempts per 15 minutes
     */
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        skipSuccessfulRequests: true
    })
};
//# sourceMappingURL=rate-limit.js.map