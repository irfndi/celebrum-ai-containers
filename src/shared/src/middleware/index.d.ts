import type { z } from 'zod';
export { ErrorHandler, errorHandler } from './error';
export { HealthCheck } from './health';
export { RateLimiter } from './rate-limit';
export type { HealthStatus, ServiceHealth, SystemHealth, HealthCheckConfig } from './health';
export type { RateLimitConfig as MiddlewareRateLimitConfig, RateLimitInfo as MiddlewareRateLimitInfo } from './rate-limit';
export interface Request {
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
    query?: Record<string, string | string[] | undefined>;
    params?: Record<string, string>;
    user?: {
        id: string;
        email: string;
        role: string;
        status: string;
    };
    ip?: string;
    method?: string;
    url?: string;
}
export interface Response {
    status: (code: number) => Response;
    json: (data: unknown) => Response;
    send: (data: unknown) => Response;
    setHeader: (name: string, value: string) => Response;
}
export type NextFunction = (error?: Error) => void;
export type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export declare const corsMiddleware: (options?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
}) => MiddlewareFunction;
export declare const rateLimitMiddleware: (options?: {
    windowMs?: number;
    max?: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
}) => MiddlewareFunction;
export declare const authMiddleware: (options?: {
    required?: boolean;
    roles?: string[];
}) => MiddlewareFunction;
export declare const validateMiddleware: <T>(schema: z.ZodSchema<T>, target?: "body" | "query" | "params") => MiddlewareFunction;
export declare const errorMiddleware: () => MiddlewareFunction;
export declare const loggingMiddleware: (options?: {
    includeBody?: boolean;
    includeHeaders?: boolean;
    excludePaths?: string[];
}) => MiddlewareFunction;
export declare const securityMiddleware: () => MiddlewareFunction;
export declare const healthCheckMiddleware: (path?: string) => MiddlewareFunction;
export declare const compressionMiddleware: () => MiddlewareFunction;
export declare const composeMiddleware: (...middlewares: MiddlewareFunction[]) => MiddlewareFunction;
export declare const middleware: {
    cors: (options?: {
        origin?: string | string[] | boolean;
        credentials?: boolean;
        methods?: string[];
        allowedHeaders?: string[];
    }) => MiddlewareFunction;
    rateLimit: (options?: {
        windowMs?: number;
        max?: number;
        keyGenerator?: (req: Request) => string;
        skipSuccessfulRequests?: boolean;
    }) => MiddlewareFunction;
    auth: (options?: {
        required?: boolean;
        roles?: string[];
    }) => MiddlewareFunction;
    validate: <T>(schema: z.ZodSchema<T>, target?: "body" | "query" | "params") => MiddlewareFunction;
    error: () => MiddlewareFunction;
    logging: (options?: {
        includeBody?: boolean;
        includeHeaders?: boolean;
        excludePaths?: string[];
    }) => MiddlewareFunction;
    security: () => MiddlewareFunction;
    healthCheck: (path?: string) => MiddlewareFunction;
    compression: () => MiddlewareFunction;
    compose: (...middlewares: MiddlewareFunction[]) => MiddlewareFunction;
};
//# sourceMappingURL=index.d.ts.map