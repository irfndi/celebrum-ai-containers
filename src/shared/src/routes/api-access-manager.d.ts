import type { Env, RBACOperationResult, ExchangeIdType } from '../types';
/**
 * API Access Manager for managing exchange and AI API configurations
 * Handles rate limiting, API key management, and access validation
 */
export declare class ApiAccessManager {
    private env;
    private rateLimitWindows;
    constructor(env: Env);
    /**
     * Add exchange API configuration for user
     */
    addExchangeApi(userId: string, exchangeId: ExchangeIdType, apiKey: string, apiSecret: string, passphrase?: string, sandbox?: boolean): Promise<RBACOperationResult>;
    /**
     * Add AI API configuration for user
     */
    addAiApi(userId: string, provider: string, apiKey: string, model?: string, endpoint?: string): Promise<RBACOperationResult>;
    /**
     * Remove exchange API
     */
    removeExchangeApi(userId: string, exchangeId: ExchangeIdType): Promise<RBACOperationResult>;
    /**
     * Remove AI API
     */
    removeAiApi(userId: string, provider: string): Promise<RBACOperationResult>;
    /**
     * Get decrypted exchange API credentials
     */
    getExchangeApiCredentials(userId: string, exchangeId: ExchangeIdType): Promise<{
        apiKey: string;
        apiSecret: string;
        passphrase?: string;
        sandbox: boolean;
    } | null>;
    /**
     * Get decrypted AI API credentials
     */
    getAiApiCredentials(userId: string, provider: string): Promise<{
        apiKey: string;
        model: string;
        endpoint: string;
    } | null>;
    /**
     * Check rate limits for user
     */
    checkRateLimit(userId: string, window?: 'hourly' | 'daily'): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    /**
     * Get user's API access summary
     */
    getApiAccessSummary(userId: string): Promise<unknown | null>;
    /**
     * Encrypt API key using Cloudflare's Web Crypto API
     */
    private encryptApiKey;
    /**
     * Decrypt API key
     */
    private decryptApiKey;
    /**
     * Toggle API status (active/inactive)
     */
    toggleApiStatus(userId: string, type: 'exchange' | 'ai', identifier: string, isActive: boolean): Promise<RBACOperationResult>;
}
//# sourceMappingURL=api-access-manager.d.ts.map