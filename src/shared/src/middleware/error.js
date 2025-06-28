"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandler = void 0;
/**
 * ErrorHandler provides centralized error handling and logging
 */
class ErrorHandler {
    /**
     * Handle errors with appropriate responses and logging
     */
    async handle(error, c) {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();
        // Log error details
        console.error(`Error ${errorId}:`, {
            message: error.message,
            stack: error.stack,
            url: c.req.url,
            method: c.req.method,
            timestamp,
            userAgent: c.req.header('User-Agent'),
            ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')
        });
        // Store error for monitoring (if KV is available)
        try {
            await this.logError(errorId, error, c);
        }
        catch (logError) {
            console.error('Failed to log error to KV:', logError);
        }
        // Determine error type and response
        const errorResponse = this.createErrorResponse(error, errorId, timestamp);
        // Set appropriate headers
        const headers = {
            'Content-Type': 'application/json',
            'X-Error-ID': errorId,
            'X-Timestamp': timestamp
        };
        return new Response(JSON.stringify(errorResponse.body), {
            status: errorResponse.status,
            headers
        });
    }
    /**
     * Create appropriate error response based on error type
     */
    createErrorResponse(error, errorId, timestamp) {
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return {
                status: 400,
                body: {
                    error: 'Validation Error',
                    message: error.message,
                    errorId,
                    timestamp
                }
            };
        }
        if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
            return {
                status: 401,
                body: {
                    error: 'Unauthorized',
                    message: 'Authentication required or invalid',
                    errorId,
                    timestamp
                }
            };
        }
        if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
            return {
                status: 403,
                body: {
                    error: 'Forbidden',
                    message: 'Access denied',
                    errorId,
                    timestamp
                }
            };
        }
        if (error.name === 'NotFoundError' || error.message.includes('not found')) {
            return {
                status: 404,
                body: {
                    error: 'Not Found',
                    message: 'The requested resource was not found',
                    errorId,
                    timestamp
                }
            };
        }
        if (error.name === 'RateLimitError' || error.message.includes('rate limit')) {
            return {
                status: 429,
                body: {
                    error: 'Rate Limit Exceeded',
                    message: 'Too many requests, please try again later',
                    errorId,
                    timestamp
                }
            };
        }
        // Default server error
        return {
            status: 500,
            body: {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                errorId,
                timestamp
            }
        };
    }
    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Log error to KV store for monitoring
     */
    async logError(errorId, error, c) {
        const env = c.env;
        if (!env.CELEBRUM_KV)
            return;
        const errorLog = {
            id: errorId,
            message: error.message,
            stack: error.stack,
            url: c.req.url,
            method: c.req.method,
            timestamp: new Date().toISOString(),
            userAgent: c.req.header('User-Agent'),
            ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')
        };
        // Store with 7 day TTL
        await env.CELEBRUM_KV.put(`error:${errorId}`, JSON.stringify(errorLog), { expirationTtl: 7 * 24 * 60 * 60 });
    }
    /**
     * Middleware function for Hono
     */
    middleware() {
        return async (c, next) => {
            try {
                await next();
            }
            catch (error) {
                return this.handle(error, c);
            }
        };
    }
    /**
     * Create error response for specific HTTP status codes
     */
    static createHttpError(status, message, details) {
        const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        const body = {
            error: this.getErrorNameFromStatus(status),
            message,
            errorId,
            timestamp,
            ...(details && typeof details === 'object' && details !== null ? { details } : {})
        };
        return new Response(JSON.stringify(body), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'X-Error-ID': errorId,
                'X-Timestamp': timestamp
            }
        });
    }
    /**
     * Get error name from HTTP status code
     */
    static getErrorNameFromStatus(status) {
        const errorNames = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout'
        };
        return errorNames[status] || 'Unknown Error';
    }
}
exports.ErrorHandler = ErrorHandler;
// Export singleton instance
exports.errorHandler = new ErrorHandler();
//# sourceMappingURL=error.js.map