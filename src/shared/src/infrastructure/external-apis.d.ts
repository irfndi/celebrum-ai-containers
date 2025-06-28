/**
 * External API management and HTTP client utilities
 */
export interface ApiResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: RequestConfig;
}
export declare class ApiError extends Error {
    status?: number;
    code?: string;
    response?: {
        data: unknown;
        status: number;
        statusText: string;
    };
    request?: RequestConfig;
    constructor(options: {
        message: string;
        status?: number;
        code?: string;
        response?: {
            data: unknown;
            status: number;
            statusText: string;
        };
        request?: RequestConfig;
    });
}
export interface RequestConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    validateStatus?: (status: number) => boolean;
}
export interface RateLimitConfig {
    requests: number;
    window: number;
    strategy: 'sliding' | 'fixed';
}
export interface ApiClientConfig {
    baseURL: string;
    timeout: number;
    retries: number;
    retryDelay: number;
    rateLimit?: RateLimitConfig;
    defaultHeaders?: Record<string, string>;
    interceptors?: {
        request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
        response?: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>;
        error?: (error: ApiError) => ApiError | Promise<ApiError>;
    };
}
/**
 * HTTP client with rate limiting, retries, and error handling
 */
export declare class ApiClient {
    private config;
    private rateLimiter?;
    constructor(config: ApiClientConfig);
    /**
     * Make an HTTP request
     */
    request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>>;
    /**
     * Execute request with retry logic
     */
    private executeWithRetries;
    /**
     * Execute the actual HTTP request
     */
    private executeRequest;
    /**
     * Parse response data based on content type
     */
    private parseResponseData;
    /**
     * Merge request config with default config
     */
    private mergeConfig;
    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
    post<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
    put<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
    patch<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
    delete<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
}
/**
 * External API manager for handling multiple external services
 */
export declare class ExternalApiManager {
    private clients;
    /**
     * Register an API client
     */
    registerClient(name: string, client: ApiClient): void;
    /**
     * Get an API client by name
     */
    getClient(name: string): ApiClient | undefined;
    /**
     * Remove an API client
     */
    removeClient(name: string): boolean;
    /**
     * Get all registered client names
     */
    getClientNames(): string[];
    /**
     * Make a request using a specific client
     */
    request<T = unknown>(clientName: string, config: RequestConfig): Promise<ApiResponse<T>>;
}
export declare const createTelegramClient: (botToken: string) => ApiClient;
export declare const createOpenAIClient: (apiKey: string) => ApiClient;
export declare const createNewsApiClient: (apiKey: string) => ApiClient;
export declare const createCoinGeckoClient: () => ApiClient;
export declare const externalApiManager: ExternalApiManager;
export declare const initializeDefaultClients: (config: {
    telegramBotToken?: string;
    openaiApiKey?: string;
    newsApiKey?: string;
}) => void;
//# sourceMappingURL=external-apis.d.ts.map