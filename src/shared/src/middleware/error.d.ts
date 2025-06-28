import type { Context } from 'hono';
import type { Env } from '../types';
/**
 * ErrorHandler provides centralized error handling and logging
 */
export declare class ErrorHandler {
    /**
     * Handle errors with appropriate responses and logging
     */
    handle(error: Error, c: Context<{
        Bindings: Env;
    }>): Promise<Response>;
    /**
     * Create appropriate error response based on error type
     */
    private createErrorResponse;
    /**
     * Generate unique error ID
     */
    private generateErrorId;
    /**
     * Log error to KV store for monitoring
     */
    private logError;
    /**
     * Middleware function for Hono
     */
    middleware(): (c: Context<{
        Bindings: Env;
    }>, next: () => Promise<void>) => Promise<Response | undefined>;
    /**
     * Create error response for specific HTTP status codes
     */
    static createHttpError(status: number, message: string, details?: unknown): Response;
    /**
     * Get error name from HTTP status code
     */
    private static getErrorNameFromStatus;
}
export declare const errorHandler: ErrorHandler;
//# sourceMappingURL=error.d.ts.map