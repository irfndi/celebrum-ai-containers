/**
 * Health check middleware for monitoring system status
 */
import type { Env } from '../types';
/**
 * Health status types
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
/**
 * Service health information
 */
export interface ServiceHealth {
    status: HealthStatus;
    responseTime?: number;
    lastCheck: string;
    error?: string;
    details?: Record<string, unknown>;
}
/**
 * System health information
 */
export interface SystemHealth {
    status: HealthStatus;
    timestamp: string;
    version?: string;
    environment?: string;
    uptime?: number;
    services: Record<string, ServiceHealth>;
}
/**
 * Health check configuration
 */
export interface HealthCheckConfig {
    path?: string;
    includeDetails?: boolean;
    checkKV?: boolean;
    checkDB?: boolean;
    checkTelegram?: boolean;
    checkOpenAI?: boolean;
    additionalChecks?: Array<(env: Env) => Promise<ServiceHealth>>;
}
/**
 * Health check middleware for monitoring system status
 */
export declare class HealthCheck {
    private config;
    private startTime;
    private version;
    /**
     * Create a new health check middleware
     */
    constructor(config?: HealthCheckConfig);
    /**
     * Middleware function for health checks
     */
    middleware: (request: Request, env: Env) => Promise<Response | null>;
    /**
     * Check overall system health
     */
    checkHealth(env: Env): Promise<SystemHealth>;
    /**
     * Check KV store health
     */
    private checkKV;
    /**
     * Check D1 database health
     */
    private checkDatabase;
    /**
     * Check Telegram API health
     */
    private checkTelegramAPI;
    /**
     * Check OpenAI API health
     */
    private checkOpenAI;
    /**
     * Determine overall system health status based on service health
     */
    private determineOverallStatus;
}
//# sourceMappingURL=health.d.ts.map