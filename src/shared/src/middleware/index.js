"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.middleware = exports.composeMiddleware = exports.compressionMiddleware = exports.healthCheckMiddleware = exports.securityMiddleware = exports.loggingMiddleware = exports.errorMiddleware = exports.validateMiddleware = exports.authMiddleware = exports.rateLimitMiddleware = exports.corsMiddleware = exports.RateLimiter = exports.HealthCheck = exports.errorHandler = exports.ErrorHandler = void 0;
const errors_1 = require("../errors");
const validation_1 = require("../validation");
const config_1 = require("../config");
// Export middleware classes
var error_1 = require("./error");
Object.defineProperty(exports, "ErrorHandler", { enumerable: true, get: function () { return error_1.ErrorHandler; } });
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return error_1.errorHandler; } });
var health_1 = require("./health");
Object.defineProperty(exports, "HealthCheck", { enumerable: true, get: function () { return health_1.HealthCheck; } });
var rate_limit_1 = require("./rate-limit");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return rate_limit_1.RateLimiter; } });
// CORS Middleware
const corsMiddleware = (options) => {
    const defaultOptions = {
        origin: config_1.API.CORS.ALLOWED_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    };
    const config = { ...defaultOptions, ...options };
    return (req, res, next) => {
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', config.origin);
            res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
            res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
            if (config.credentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            res.status(204).send('');
            return;
        }
        // Set CORS headers for actual requests
        res.setHeader('Access-Control-Allow-Origin', config.origin);
        if (config.credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        next();
    };
};
exports.corsMiddleware = corsMiddleware;
const rateLimitStore = {};
const rateLimitMiddleware = (options) => {
    const defaultOptions = {
        windowMs: config_1.API.RATE_LIMIT.WINDOW_MS,
        max: config_1.API.RATE_LIMIT.MAX_REQUESTS,
        keyGenerator: (req) => req.ip || 'unknown',
        skipSuccessfulRequests: false,
    };
    const config = { ...defaultOptions, ...options };
    return (req, res, next) => {
        const key = config.keyGenerator(req);
        const now = Date.now();
        const windowStart = now - config.windowMs;
        // Clean up old entries
        Object.keys(rateLimitStore).forEach(storeKey => {
            if (rateLimitStore[storeKey].resetTime < windowStart) {
                delete rateLimitStore[storeKey];
            }
        });
        // Get or create rate limit entry
        if (!rateLimitStore[key] || rateLimitStore[key].resetTime < windowStart) {
            rateLimitStore[key] = {
                count: 0,
                resetTime: now + config.windowMs,
            };
        }
        // Check rate limit
        if (rateLimitStore[key].count >= config.max) {
            const resetTime = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
            res.setHeader('X-RateLimit-Limit', config.max.toString());
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', resetTime.toString());
            throw new errors_1.RateLimitError(`Too many requests. Try again in ${resetTime} seconds.`);
        }
        // Increment counter
        rateLimitStore[key].count++;
        // Set rate limit headers
        const remaining = Math.max(0, config.max - rateLimitStore[key].count);
        const resetTime = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
        res.setHeader('X-RateLimit-Limit', config.max.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toString());
        next();
    };
};
exports.rateLimitMiddleware = rateLimitMiddleware;
// Authentication Middleware
const authMiddleware = (options) => {
    const config = {
        required: true,
        roles: [],
        ...options,
    };
    return (req, _res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            if (config.required) {
                throw new errors_1.AuthenticationError('Authorization header is required');
            }
            return next();
        }
        const token = authHeader.toString().replace('Bearer ', '');
        if (!token) {
            if (config.required) {
                throw new errors_1.AuthenticationError('Invalid authorization format');
            }
            return next();
        }
        try {
            // This would typically verify JWT token
            // For now, we'll simulate user extraction
            const user = extractUserFromToken(token);
            if (!user) {
                throw new errors_1.AuthenticationError('Invalid or expired token');
            }
            // Check role authorization
            if (config.roles.length > 0 && !config.roles.includes(user.role)) {
                throw new errors_1.AuthenticationError('Insufficient permissions');
            }
            req.user = user;
            next();
        }
        catch (error) {
            if (config.required) {
                throw new errors_1.AuthenticationError('Token verification failed');
            }
            // Log error for debugging if needed
            console.debug('Auth middleware error:', error);
            next();
        }
    };
};
exports.authMiddleware = authMiddleware;
// Mock function for token extraction (replace with actual JWT verification)
const extractUserFromToken = (token) => {
    // This is a placeholder - implement actual JWT verification
    try {
        // Simulate token parsing
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            status: payload.status,
        };
    }
    catch {
        return null;
    }
};
// Validation Middleware
const validateMiddleware = (schema, target = 'body') => {
    return (req, _res, next) => {
        try {
            const data = req[target];
            const result = schema.safeParse(data);
            if (!result.success) {
                const errors = (0, validation_1.formatValidationErrors)(result.error);
                throw new errors_1.ValidationError('Validation failed', { errors });
            }
            // Replace the original data with validated data
            req[target] = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateMiddleware = validateMiddleware;
// Error Handling Middleware
const errorMiddleware = () => {
    return (_req, res, next) => {
        try {
            next();
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        timestamp: error.timestamp,
                        ...(error.details && { details: error.details }),
                    },
                });
                return;
            }
            // Handle unknown errors
            console.error('Unhandled error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Internal server error',
                    code: 'INTERNAL_ERROR',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };
};
exports.errorMiddleware = errorMiddleware;
// Request Logging Middleware
const loggingMiddleware = (options) => {
    const config = {
        includeBody: false,
        includeHeaders: false,
        excludePaths: ['/health', '/metrics'],
        ...options,
    };
    return (req, res, next) => {
        const start = Date.now();
        // Skip logging for excluded paths
        if (config.excludePaths.some(path => req.url?.includes(path))) {
            return next();
        }
        const logData = {
            method: req.method,
            url: req.url,
            ip: req.ip,
            timestamp: new Date().toISOString(),
        };
        if (config.includeHeaders) {
            logData.headers = req.headers;
        }
        if (config.includeBody && req.body) {
            logData.body = req.body;
        }
        console.log('Request:', logData);
        // Log response time when request completes
        const originalJson = res.json;
        res.json = function (data) {
            const duration = Date.now() - start;
            console.log('Response:', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString(),
            });
            return originalJson.call(this, data);
        };
        next();
    };
};
exports.loggingMiddleware = loggingMiddleware;
// Security Headers Middleware
const securityMiddleware = () => {
    return (_req, res, next) => {
        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        next();
    };
};
exports.securityMiddleware = securityMiddleware;
// Health Check Middleware
const healthCheckMiddleware = (path = '/health') => {
    return (req, res, next) => {
        if (req.url === path && req.method === 'GET') {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            });
            return;
        }
        next();
    };
};
exports.healthCheckMiddleware = healthCheckMiddleware;
// Compression Middleware (placeholder)
const compressionMiddleware = () => {
    return (_req, _res, next) => {
        // This would typically implement gzip compression
        // For now, just pass through
        next();
    };
};
exports.compressionMiddleware = compressionMiddleware;
// Middleware composition utility
const composeMiddleware = (...middlewares) => {
    return (req, res, next) => {
        let index = 0;
        const dispatch = (i) => {
            if (i <= index) {
                throw new Error('next() called multiple times');
            }
            index = i;
            if (i >= middlewares.length) {
                return next();
            }
            const middleware = middlewares[i];
            try {
                middleware(req, res, () => dispatch(i + 1));
            }
            catch (error) {
                next(error instanceof Error ? error : new Error(String(error)));
            }
        };
        dispatch(0);
    };
};
exports.composeMiddleware = composeMiddleware;
// Export all middleware
exports.middleware = {
    cors: exports.corsMiddleware,
    rateLimit: exports.rateLimitMiddleware,
    auth: exports.authMiddleware,
    validate: exports.validateMiddleware,
    error: exports.errorMiddleware,
    logging: exports.loggingMiddleware,
    security: exports.securityMiddleware,
    healthCheck: exports.healthCheckMiddleware,
    compression: exports.compressionMiddleware,
    compose: exports.composeMiddleware,
};
//# sourceMappingURL=index.js.map