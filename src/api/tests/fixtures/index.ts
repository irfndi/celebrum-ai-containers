// API Test Fixtures
import type { User, MarketData, TradingSignal } from '../../../shared/src/types';

// Mock Express-like types for testing
interface MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  params: Record<string, string>;
  query: Record<string, string>;
  user?: any;
}

interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
  send: (data: any) => MockResponse;
  cookie: (name: string, value: string, options?: any) => MockResponse;
  clearCookie: (name: string) => MockResponse;
  redirect: (url: string) => MockResponse;
  header: (name: string, value: string) => MockResponse;
  locals: Record<string, any>;
}

// Mock API Request Fixtures
export const mockApiRequest = {
  method: 'GET',
  url: '/api/v1/test',
  headers: {
    'content-type': 'application/json',
    'authorization': 'Bearer test-token',
    'user-agent': 'test-client/1.0'
  },
  body: {},
  params: {},
  query: {},
  user: {
    id: 'user_123',
    telegramId: 123456789,
    role: 'user' as const
  }
} as MockRequest;

export const mockAuthenticatedRequest = {
  ...mockApiRequest,
  headers: {
    ...mockApiRequest.headers,
    'authorization': 'Bearer valid-jwt-token'
  },
  user: {
    id: 'user_123',
    telegramId: 123456789,
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    role: 'user' as const,
    status: 'active' as const
  }
} as MockRequest;

export const mockAdminRequest = {
  ...mockApiRequest,
  headers: {
    ...mockApiRequest.headers,
    'authorization': 'Bearer admin-jwt-token'
  },
  user: {
    id: 'admin_123',
    telegramId: 987654321,
    firstName: 'Admin',
    lastName: 'User',
    username: 'admin',
    role: 'admin' as const,
    status: 'active' as const
  }
} as MockRequest;

// Mock API Response Fixtures
export const mockApiResponse: MockResponse = {
  status: (code: number) => mockApiResponse,
  json: (data: any) => mockApiResponse,
  send: (data: any) => mockApiResponse,
  cookie: (name: string, value: string, options?: any) => mockApiResponse,
  clearCookie: (name: string) => mockApiResponse,
  redirect: (url: string) => mockApiResponse,
  header: (name: string, value: string) => mockApiResponse,
  locals: {}
};

// API Error Fixtures
export const mockApiError = {
  status: 400,
  message: 'Bad Request',
  code: 'INVALID_REQUEST',
  details: {
    field: 'email',
    issue: 'Invalid email format'
  }
};

export const mockValidationError = {
  status: 422,
  message: 'Validation Error',
  code: 'VALIDATION_FAILED',
  details: {
    errors: [
      { field: 'symbol', message: 'Symbol is required' },
      { field: 'quantity', message: 'Quantity must be positive' }
    ]
  }
};

export const mockAuthError = {
  status: 401,
  message: 'Unauthorized',
  code: 'UNAUTHORIZED',
  details: {
    reason: 'Invalid or expired token'
  }
};

export const mockForbiddenError = {
  status: 403,
  message: 'Forbidden',
  code: 'FORBIDDEN',
  details: {
    reason: 'Insufficient permissions'
  }
};

export const mockNotFoundError = {
  status: 404,
  message: 'Not Found',
  code: 'NOT_FOUND',
  details: {
    resource: 'position',
    id: 'pos_123'
  }
};

export const mockRateLimitError = {
  status: 429,
  message: 'Too Many Requests',
  code: 'RATE_LIMIT_EXCEEDED',
  details: {
    limit: 100,
    window: '1h',
    retryAfter: 3600
  }
};

// API Success Response Fixtures
export const mockSuccessResponse = {
  success: true,
  data: {
    message: 'Operation completed successfully'
  },
  timestamp: new Date().toISOString()
};

export const mockPaginatedResponse = {
  success: true,
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5,
    hasNext: true,
    hasPrev: false
  },
  timestamp: new Date().toISOString()
};

// API Endpoint Specific Fixtures
export const mockPositionsApiResponse = {
  success: true,
  data: [
    {
      id: 'pos_123',
      userId: 'user_123',
      symbol: 'BTCUSDT',
      type: 'long',
      entryPrice: 45000,
      quantity: 0.1,
      status: 'open',
      pnl: 500,
      createdAt: new Date().toISOString()
    }
  ],
  timestamp: new Date().toISOString()
};

export const mockMarketDataApiResponse = {
  success: true,
  data: {
    symbol: 'BTCUSDT',
    price: 45500,
    change24h: 2.5,
    volume24h: 1234567890,
    high24h: 46000,
    low24h: 44000,
    timestamp: new Date().toISOString()
  },
  timestamp: new Date().toISOString()
};

export const mockSignalsApiResponse = {
  success: true,
  data: [
    {
      id: 'signal_123',
      symbol: 'ETHUSDT',
      type: 'buy',
      price: 3200,
      confidence: 0.85,
      strategy: 'momentum',
      createdAt: new Date().toISOString()
    }
  ],
  timestamp: new Date().toISOString()
};

// Helper Functions
export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => ({
  ...mockApiRequest,
  ...overrides
});

export const createMockResponse = (overrides: Partial<MockResponse> = {}): MockResponse => ({
  ...mockApiResponse,
  ...overrides
});

export const createMockApiError = (status: number, message: string, code: string, details?: any) => ({
  status,
  message,
  code,
  details: details || {}
});

export const createMockSuccessResponse = (data: any, pagination?: any) => ({
  success: true,
  data,
  ...(pagination && { pagination }),
  timestamp: new Date().toISOString()
});

// Authentication Fixtures
export const mockJwtPayload = {
  userId: 'user_123',
  telegramId: 123456789,
  role: 'user' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
};

export const mockAdminJwtPayload = {
  userId: 'admin_123',
  telegramId: 987654321,
  role: 'admin' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

export const mockExpiredJwtPayload = {
  userId: 'user_123',
  telegramId: 123456789,
  role: 'user' as const,
  iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
  exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
};

// Rate Limiting Fixtures
export const mockRateLimitInfo = {
  limit: 100,
  remaining: 95,
  reset: Date.now() + 3600000, // 1 hour from now
  window: 3600 // 1 hour in seconds
};

export const mockRateLimitExceeded = {
  limit: 100,
  remaining: 0,
  reset: Date.now() + 3600000,
  window: 3600
};

// Webhook Fixtures
export const mockWebhookPayload = {
  event: 'position.updated',
  data: {
    positionId: 'pos_123',
    userId: 'user_123',
    status: 'closed',
    pnl: 150.50
  },
  timestamp: new Date().toISOString(),
  signature: 'webhook-signature-hash'
};

export const mockTradingWebhookPayload = {
  event: 'signal.generated',
  data: {
    signalId: 'signal_456',
    symbol: 'BTCUSDT',
    type: 'sell',
    price: 44500,
    confidence: 0.92
  },
  timestamp: new Date().toISOString(),
  signature: 'trading-webhook-signature'
};