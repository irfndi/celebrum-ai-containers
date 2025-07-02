export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // seconds
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

// Request types
export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  initialBalance: number;
  baseCurrency: string;
  type: 'live' | 'paper' | 'backtest';
  exchange: string;
  settings?: Record<string, unknown>;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface CreateOrderRequest {
  portfolioId: string;
  symbol: string;
  exchange: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'DAY';
}

export interface UpdateOrderRequest {
  price?: number;
  stopPrice?: number;
  quantity?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'DAY';
}

export interface CreateStrategyRequest {
  name: string;
  description: string;
  type: 'technical' | 'fundamental' | 'quantitative' | 'hybrid';
  timeframe: string;
  symbols: string[];
  exchanges: string[];
  parameters: Record<string, unknown>;
  rules: {
    entry: unknown[];
    exit: unknown[];
    riskManagement: unknown[];
  };
  isPublic: boolean;
}

export interface UpdateStrategyRequest {
  name?: string;
  description?: string;
  timeframe?: string;
  symbols?: string[];
  exchanges?: string[];
  parameters?: Record<string, unknown>;
  rules?: {
    entry?: unknown[];
    exit?: unknown[];
    riskManagement?: unknown[];
  };
  isActive?: boolean;
  isPublic?: boolean;
}

export interface BacktestRequest {
  strategyId: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameters?: Record<string, unknown>;
}

export interface CreateAlertRequest {
  symbol: string;
  exchange: string;
  condition: 'above' | 'below' | 'crosses_up' | 'crosses_down';
  targetPrice: number;
  notificationMethod: 'telegram' | 'email' | 'webhook';
  expiresAt?: string;
}

export interface UpdateAlertRequest {
  condition?: 'above' | 'below' | 'crosses_up' | 'crosses_down';
  targetPrice?: number;
  notificationMethod?: 'telegram' | 'email' | 'webhook';
  isActive?: boolean;
  expiresAt?: string;
}

export interface MarketDataRequest {
  symbol: string;
  exchange?: string;
  interval?: string;
  limit?: number;
  startTime?: string;
  endTime?: string;
}

export interface SearchRequest {
  query: string;
  type?: 'symbol' | 'exchange' | 'strategy' | 'portfolio' | 'all';
  limit?: number;
  page?: number;
}

export interface FilterOptions {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
  exchange?: string;
  symbol?: string;
  [key: string]: unknown;
}

export interface WebhookRegistrationRequest {
  url: string;
  events: string[];
  description?: string;
  secret?: string;
  isActive?: boolean;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  description?: string;
  secret?: string;
  isActive?: boolean;
}

export interface ApiKeyRequest {
  name: string;
  permissions: string[];
  expiresAt?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned once when created
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    latency?: number;
  }>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId?: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      fields: Record<string, string[]>;
    };
  };
}

export interface AuthErrorResponse extends ErrorResponse {
  error: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN';
    message: string;
    details?: {
      reason: string;
    };
  };
}

export interface RateLimitErrorResponse extends ErrorResponse {
  error: {
    code: 'RATE_LIMIT_EXCEEDED';
    message: string;
    details: {
      limit: number;
      remaining: number;
      reset: number;
      retryAfter: number;
    };
  };
}

export interface ServerErrorResponse extends ErrorResponse {
  error: {
    code: 'INTERNAL_SERVER_ERROR' | 'SERVICE_UNAVAILABLE';
    message: string;
    details?: {
      retryable: boolean;
    };
  };
}

export interface NotFoundErrorResponse extends ErrorResponse {
  error: {
    code: 'NOT_FOUND';
    message: string;
    details?: {
      resource: string;
      id?: string;
    };
  };
}

export interface ConflictErrorResponse extends ErrorResponse {
  error: {
    code: 'CONFLICT';
    message: string;
    details?: {
      resource: string;
      field?: string;
    };
  };
}