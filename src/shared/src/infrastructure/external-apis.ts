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

export class ApiError extends Error {
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
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.response = options.response;
    this.request = options.request;
  }
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
  window: number; // milliseconds
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
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    
    if (this.config.strategy === 'sliding') {
      // Remove requests outside the window
      this.requests = this.requests.filter(time => now - time < this.config.window);
      return this.requests.length < this.config.requests;
    } else {
      // Fixed window strategy
      const windowStart = Math.floor(now / this.config.window) * this.config.window;
      this.requests = this.requests.filter(time => time >= windowStart);
      return this.requests.length < this.config.requests;
    }
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Get time until next request is allowed
   */
  getRetryAfter(): number {
    if (this.canMakeRequest()) {
      return 0;
    }

    const now = Date.now();
    if (this.config.strategy === 'sliding') {
      const oldestRequest = Math.min(...this.requests);
      return Math.max(0, this.config.window - (now - oldestRequest));
    } else {
      const windowStart = Math.floor(now / this.config.window) * this.config.window;
      return windowStart + this.config.window - now;
    }
  }
}

/**
 * HTTP client with rate limiting, retries, and error handling
 */
export class ApiClient {
  private config: ApiClientConfig;
  private rateLimiter?: RateLimiter;

  constructor(config: ApiClientConfig) {
    this.config = config;
    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit);
    }
  }

  /**
   * Make an HTTP request
   */
  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    // Merge with default config
    const finalConfig = this.mergeConfig(config);

    // Apply request interceptor
    const interceptedConfig = this.config.interceptors?.request 
      ? await this.config.interceptors.request(finalConfig)
      : finalConfig;

    // Check rate limit
    if (this.rateLimiter && !this.rateLimiter.canMakeRequest()) {
      const retryAfter = this.rateLimiter.getRetryAfter();
      throw new ApiError({
        message: `Rate limit exceeded. Retry after ${retryAfter}ms`,
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // Record request for rate limiting
    if (this.rateLimiter) {
      this.rateLimiter.recordRequest();
    }

    // Execute request with retries
    return this.executeWithRetries(interceptedConfig);
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetries<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    let lastError: ApiError;
    const maxRetries = config.retries || this.config.retries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(config);
        
        // Apply response interceptor
        return this.config.interceptors?.response 
          ? await this.config.interceptors.response(response) as ApiResponse<T>
          : response;
      } catch (error) {
        lastError = error as ApiError;
        
        // Apply error interceptor
        if (this.config.interceptors?.error) {
          lastError = await this.config.interceptors.error(lastError);
        }

        // Don't retry on client errors (4xx) except 429
        if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(attempt, config.retryDelay || this.config.retryDelay);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = new URL(config.url, this.config.baseURL);
    
    // Add query parameters
    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Prepare headers
    const headers = new Headers({
      ...this.config.defaultHeaders,
      ...config.headers,
    });

    // Prepare request body
    let body: string | undefined;
    if (config.data) {
      if (typeof config.data === 'object') {
        body = JSON.stringify(config.data);
        headers.set('Content-Type', 'application/json');
      } else {
        body = String(config.data);
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = config.timeout || this.config.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal,
      };
      
      // Only add body for non-GET requests
      if (config.method !== 'GET' && body) {
        fetchOptions.body = body;
      }
      
      const response = await fetch(url.toString(), fetchOptions);

      clearTimeout(timeoutId);

      // Check if status is valid
      const validateStatus = config.validateStatus || ((status) => status >= 200 && status < 300);
      if (!validateStatus(response.status)) {
        const errorData = await this.parseResponseData(response);
        throw new ApiError({
          message: `Request failed with status ${response.status}`,
          status: response.status,
          response: {
            data: errorData,
            status: response.status,
            statusText: response.statusText,
          },
          request: config,
        });
      }

      // Parse response data
      const data = await this.parseResponseData<T>(response);
      
      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle fetch errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError({
            message: `Request timeout after ${timeout}ms`,
            code: 'TIMEOUT',
            request: config,
          });
        }
        
        throw new ApiError({
          message: error.message,
          code: 'NETWORK_ERROR',
          request: config,
        });
      }

      throw new ApiError({
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        request: config,
      });
    }
  }

  /**
   * Parse response data based on content type
   */
  private async parseResponseData<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    }
    
    if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    }
    
    // For other content types, return as blob
    return response.blob() as unknown as T;
  }

  /**
   * Merge request config with default config
   */
  private mergeConfig(config: RequestConfig): RequestConfig {
    return {
      ...config,
      headers: {
        ...this.config.defaultHeaders,
        ...config.headers,
      },
      timeout: config.timeout || this.config.timeout,
      retries: config.retries !== undefined ? config.retries : this.config.retries,
      retryDelay: config.retryDelay || this.config.retryDelay,
    };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  async put<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }

  async delete<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }
}

/**
 * External API manager for handling multiple external services
 */
export class ExternalApiManager {
  private clients: Map<string, ApiClient> = new Map();

  /**
   * Register an API client
   */
  registerClient(name: string, client: ApiClient): void {
    this.clients.set(name, client);
  }

  /**
   * Get an API client by name
   */
  getClient(name: string): ApiClient | undefined {
    return this.clients.get(name);
  }

  /**
   * Remove an API client
   */
  removeClient(name: string): boolean {
    return this.clients.delete(name);
  }

  /**
   * Get all registered client names
   */
  getClientNames(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Make a request using a specific client
   */
  async request<T = unknown>(clientName: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const client = this.clients.get(clientName);
    if (!client) {
      throw new Error(`API client '${clientName}' not found`);
    }
    return client.request<T>(config);
  }
}

// Pre-configured clients for common services
export const createTelegramClient = (botToken: string): ApiClient => {
  return new ApiClient({
    baseURL: 'https://api.telegram.org',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    defaultHeaders: {
      'Authorization': `Bearer ${botToken}`,
    },
    rateLimit: {
      requests: 30,
      window: 1000, // 30 requests per second
      strategy: 'sliding',
    },
  });
};

export const createOpenAIClient = (apiKey: string): ApiClient => {
  return new ApiClient({
    baseURL: 'https://api.openai.com/v1',
    timeout: 60000,
    retries: 3,
    retryDelay: 2000,
    defaultHeaders: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    rateLimit: {
      requests: 60,
      window: 60000, // 60 requests per minute
      strategy: 'sliding',
    },
  });
};

export const createNewsApiClient = (apiKey: string): ApiClient => {
  return new ApiClient({
    baseURL: 'https://newsapi.org/v2',
    timeout: 15000,
    retries: 2,
    retryDelay: 1000,
    defaultHeaders: {
      'X-API-Key': apiKey,
    },
    rateLimit: {
      requests: 1000,
      window: 86400000, // 1000 requests per day
      strategy: 'fixed',
    },
  });
};

export const createCoinGeckoClient = (): ApiClient => {
  return new ApiClient({
    baseURL: 'https://api.coingecko.com/api/v3',
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
    rateLimit: {
      requests: 50,
      window: 60000, // 50 requests per minute
      strategy: 'sliding',
    },
  });
};

// Export singleton instance
export const externalApiManager = new ExternalApiManager();

// Register default clients (you'll need to provide API keys)
export const initializeDefaultClients = (config: {
  telegramBotToken?: string;
  openaiApiKey?: string;
  newsApiKey?: string;
}) => {
  if (config.telegramBotToken) {
    externalApiManager.registerClient('telegram', createTelegramClient(config.telegramBotToken));
  }
  
  if (config.openaiApiKey) {
    externalApiManager.registerClient('openai', createOpenAIClient(config.openaiApiKey));
  }
  
  if (config.newsApiKey) {
    externalApiManager.registerClient('news', createNewsApiClient(config.newsApiKey));
  }
  
  externalApiManager.registerClient('coingecko', createCoinGeckoClient());
};