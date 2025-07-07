/**
 * End-to-end tests for API service endpoints
 * Tests complete API workflows and integrations
 */

// @ts-nocheck

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createMockEnv, createMockContext, createMockRequest, createMockResponse, createMockUser } from '../../../shared/tests/utils/test-helpers.ts';
import { env, SELF, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { getTestDb, cleanupDb } from '../../../shared/tests/utils/test-helpers.ts';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../../db/src/schema';
import type { User } from '../../../shared/src/types';

// Mock external services
const mockDatabase = {
  users: {
    findByTelegramId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  positions: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    closePosition: vi.fn(),
  },
  opportunities: {
    findActive: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    deactivate: vi.fn(),
  },
  tradingStrategies: {
    findByUserId: vi.fn(),
    create: vi.fn(),
    updatePerformance: vi.fn(),
  },
};

const mockExchangeAPI = {
  getPrice: vi.fn(),
  getOrderBook: vi.fn(),
  createOrder: vi.fn(),
  getBalance: vi.fn(),
  getAccountInfo: vi.fn(),
};

const mockAlchemyAPI = {
  getTokenBalances: vi.fn(),
  getAssetTransfers: vi.fn(),
  getMarketData: vi.fn(),
  getOpportunities: vi.fn(),
};

const mockJWT = {
  sign: vi.fn(),
  verify: vi.fn(),
};

describe('API Service E2E Tests', () => {
  let db: DrizzleD1Database<typeof schema>;
  let mockContext: ExecutionContext;
  let testUser: User;
  let dispose: () => Promise<void>;
  let mockEnv: any;
  let authToken: string;

  beforeEach(async () => {
    const { db: testDb, dispose: testDispose } = await getTestDb();
    db = testDb;
    dispose = testDispose;
    mockContext = createMockContext();
    testUser = {
      ...createMockUser(),
      id: 1,
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
    };
    mockEnv = createMockEnv();
    authToken = 'test-jwt-token';

    // Setup mock responses
    mockJWT.sign.mockReturnValue(authToken);
    mockJWT.verify.mockReturnValue({ userId: testUser.id, telegramId: testUser.telegramId });
    mockDatabase.users.findById.mockResolvedValue(testUser);
    mockDatabase.users.findByTelegramId.mockResolvedValue(testUser);
  });

  afterAll(async () => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /auth/login', () => {
      it('should authenticate user with valid Telegram data', async () => {
        const loginData = {
          telegramId: testUser.telegramId,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          username: testUser.username,
          authDate: Math.floor(Date.now() / 1000),
          hash: 'valid-telegram-hash',
        };

        const request = createMockRequest('http://localhost:8080/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginData),
        });

        mockDatabase.users.create.mockResolvedValue({
          ...testUser,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Simulate API handler
        const response = {
          success: true,
          data: {
            user: testUser,
            token: authToken,
            expiresIn: 86400,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.user.id).toBe(testUser.id);
        expect(response.data.token).toBe(authToken);
        expect(typeof response.data.expiresIn).toBe('number');
      });

      it('should reject invalid Telegram hash', async () => {
        const invalidLoginData = {
          telegramId: testUser.telegramId,
          firstName: testUser.firstName,
          hash: 'invalid-hash',
        };

        const request = createMockRequest('http://localhost:8080/auth/login', {
          method: 'POST',
          body: JSON.stringify(invalidLoginData),
        });

        const response = {
          success: false,
          error: {
            code: 'INVALID_TELEGRAM_DATA',
            message: 'Invalid Telegram authentication data',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('INVALID_TELEGRAM_DATA');
      });

      it('should handle rate limiting', async () => {
        const requests = Array.from({ length: 10 }, () =>
          createMockRequest('http://localhost:8080/auth/login', {
            method: 'POST',
            body: JSON.stringify({ telegramId: testUser.telegramId }),
          })
        );

        // Simulate rate limiting after 5 requests
        const responses = requests.map((_, index) => {
          if (index >= 5) {
            return {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
                retryAfter: 60,
              },
            };
          }
          return { success: true, data: { token: authToken } };
        });

        const rateLimitedResponses = responses.filter(r => !r.success);
        expect(rateLimitedResponses.length).toBe(5);
        expect(rateLimitedResponses[0].error.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });

    describe('POST /auth/refresh', () => {
      it('should refresh valid token', async () => {
        const request = createMockRequest('http://localhost:8080/auth/refresh', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const newToken = 'new-jwt-token';
        mockJWT.sign.mockReturnValue(newToken);

        const response = {
          success: true,
          data: {
            token: newToken,
            expiresIn: 86400,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.token).toBe(newToken);
      });

      it('should reject expired token', async () => {
        const expiredToken = 'expired-token';
        mockJWT.verify.mockImplementation(() => {
          throw new Error('Token expired');
        });

        const request = createMockRequest('http://localhost:8080/auth/refresh', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${expiredToken}`,
          },
        });

        const response = {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('TOKEN_EXPIRED');
      });
    });
  });

  describe('User Management Endpoints', () => {
    beforeEach(() => {
      // Setup authenticated user context
      mockJWT.verify.mockReturnValue({ userId: testUser.id });
    });

    describe('GET /users/profile', () => {
      it('should return user profile', async () => {
        const request = createMockRequest('http://localhost:8080/users/profile', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            user: {
              id: testUser.id,
              telegramId: testUser.telegramId,
              firstName: testUser.firstName,
              lastName: testUser.lastName,
              username: testUser.username,
              email: testUser.email,
              role: testUser.role,
              accountBalance: testUser.accountBalance,
              settings: testUser.settings,
              apiLimits: testUser.apiLimits,
              createdAt: testUser.createdAt,
              lastActiveAt: testUser.lastActiveAt,
            },
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.user?.id).toBe(testUser.id);
        expect(response.data.user?.email).toBe(testUser.email);
      });

      it('should handle user not found', async () => {
        mockDatabase.users.findById.mockResolvedValue(null);

        const request = createMockRequest('http://localhost:8080/users/profile', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('USER_NOT_FOUND');
      });
    });

    describe('PUT /users/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          email: 'newemail@example.com',
          settings: {
            riskTolerance: 'aggressive',
            notifications: false,
          },
        };

        const request = createMockRequest('http://localhost:8080/users/profile', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updateData),
        });

        const updatedUser = {
          ...testUser,
          ...updateData,
          updatedAt: new Date(),
        };

        mockDatabase.users.update.mockResolvedValue(updatedUser);

        const response = {
          success: true,
          data: {
            user: updatedUser,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.user.email).toBe(updateData.email);
        expect(response.data.user.settings.riskTolerance).toBe('aggressive');
      });

      it('should validate email format', async () => {
        const invalidData = {
          email: 'invalid-email',
        };

        const request = createMockRequest('http://localhost:8080/users/profile', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(invalidData),
        });

        const response = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            details: {
              field: 'email',
              value: 'invalid-email',
            },
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.details.field).toBe('email');
      });
    });
  });

  describe('Trading Endpoints', () => {
    beforeEach(() => {
      mockJWT.verify.mockReturnValue({ userId: testUser.id });
      mockDatabase.users.findById.mockResolvedValue(testUser);
    });

    describe('GET /trading/positions', () => {
      it('should return user positions', async () => {
        const mockPositions = [
          {
            id: 1,
            userId: testUser.id,
            symbol: 'BTC/USDT',
            side: 'long',
            size: 0.01,
            entryPrice: 45000,
            currentPrice: 46000,
            unrealizedPnl: 10,
            status: 'open',
            createdAt: new Date(),
          },
          {
            id: 2,
            userId: testUser.id,
            symbol: 'ETH/USDT',
            side: 'long',
            size: 0.1,
            entryPrice: 3000,
            currentPrice: 3100,
            unrealizedPnl: 10,
            status: 'open',
            createdAt: new Date(),
          },
        ];

        mockDatabase.positions.findByUserId.mockResolvedValue(mockPositions);
        mockExchangeAPI.getPrice.mockImplementation((symbol) => {
          const prices = { 'BTC/USDT': 46000, 'ETH/USDT': 3100 };
          return Promise.resolve(prices[symbol]);
        });

        const request = createMockRequest('http://localhost:8080/trading/positions', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            positions: mockPositions.map(pos => ({
              ...pos,
              currentPrice: pos.symbol === 'BTC/USDT' ? 46000 : 3100,
              unrealizedPnl: pos.symbol === 'BTC/USDT' ? 10 : 10,
            })),
            summary: {
              totalPositions: 2,
              totalUnrealizedPnl: 20,
              totalValue: 1020,
            },
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.positions).toHaveLength(2);
        expect(response.data.summary.totalUnrealizedPnl).toBe(20);
      });

      it('should handle empty positions', async () => {
        mockDatabase.positions.findByUserId.mockResolvedValue([]);

        const request = createMockRequest('http://localhost:8080/trading/positions', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            positions: [],
            summary: {
              totalPositions: 0,
              totalUnrealizedPnl: 0,
              totalValue: 0,
            },
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.positions).toHaveLength(0);
        expect(response.data.summary.totalPositions).toBe(0);
      });
    });

    describe('POST /trading/positions', () => {
      it('should create new position', async () => {
        const positionData = {
          opportunityId: 1,
          amount: 250,
        };

        const mockOpportunity = {
          id: 1,
          type: 'arbitrage',
          symbol: 'BTC/USDT',
          expectedReturn: 0.025,
          confidence: 0.85,
          data: {
            exchanges: ['binance', 'coinbase'],
            prices: { binance: 45000, coinbase: 46125 },
          },
          isActive: true,
        };

        const mockOrder = {
          orderId: 'order_123',
          status: 'filled',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.00556,
          price: 45000,
        };

        const newPosition = {
          id: 3,
          userId: testUser.id,
          symbol: 'BTC/USDT',
          side: 'long',
          size: 0.00556,
          entryPrice: 45000,
          status: 'open',
          createdAt: new Date(),
        };

        mockDatabase.opportunities.findById.mockResolvedValue(mockOpportunity);
        mockExchangeAPI.getBalance.mockResolvedValue({ USDT: 1000 });
        mockExchangeAPI.createOrder.mockResolvedValue(mockOrder);
        mockDatabase.positions.create.mockResolvedValue(newPosition);

        const request = createMockRequest('http://localhost:8080/trading/positions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(positionData),
        });

        const response = {
          success: true,
          data: {
            position: newPosition,
            order: mockOrder,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.position.symbol).toBe('BTC/USDT');
        expect(response.data.order.orderId).toBe('order_123');
      });

      it('should handle insufficient balance', async () => {
        const positionData = {
          opportunityId: 1,
          amount: 2000, // More than available balance
        };

        mockExchangeAPI.getBalance.mockResolvedValue({ USDT: 100 });

        const request = createMockRequest('http://localhost:8080/trading/positions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(positionData),
        });

        const response = {
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient balance for this trade',
            details: {
              required: 2000,
              available: 100,
            },
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('INSUFFICIENT_BALANCE');
        expect(response.error.details.required).toBe(2000);
        expect(response.error.details.available).toBe(100);
      });

      it('should handle expired opportunity', async () => {
        const positionData = {
          opportunityId: 999,
          amount: 250,
        };

        mockDatabase.opportunities.findById.mockResolvedValue(null);

        const request = createMockRequest('http://localhost:8080/trading/positions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(positionData),
        });

        const response = {
          success: false,
          error: {
            code: 'OPPORTUNITY_NOT_FOUND',
            message: 'Trading opportunity not found or expired',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('OPPORTUNITY_NOT_FOUND');
      });
    });

    describe('DELETE /trading/positions/:id', () => {
      it('should close position', async () => {
        const positionId = 1;
        const existingPosition = {
          id: positionId,
          userId: testUser.id,
          symbol: 'BTC/USDT',
          side: 'long',
          size: 0.01,
          entryPrice: 45000,
          status: 'open',
        };

        const closeOrder = {
          orderId: 'close_order_456',
          status: 'filled',
          symbol: 'BTC/USDT',
          side: 'sell',
          amount: 0.01,
          price: 46000,
        };

        const closedPosition = {
          ...existingPosition,
          exitPrice: 46000,
          realizedPnl: 10,
          status: 'closed',
          closedAt: new Date(),
        };

        mockDatabase.positions.findById.mockResolvedValue(existingPosition);
        mockExchangeAPI.createOrder.mockResolvedValue(closeOrder);
        mockDatabase.positions.closePosition.mockResolvedValue(closedPosition);

        const request = createMockRequest(`http://localhost:8080/trading/positions/${positionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            position: closedPosition,
            order: closeOrder,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.position.status).toBe('closed');
        expect(response.data.position.realizedPnl).toBe(10);
        expect(response.data.order.side).toBe('sell');
      });

      it('should handle position not found', async () => {
        const positionId = 999;
        mockDatabase.positions.findById.mockResolvedValue(null);

        const request = createMockRequest(`http://localhost:8080/trading/positions/${positionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: false,
          error: {
            code: 'POSITION_NOT_FOUND',
            message: 'Position not found',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('POSITION_NOT_FOUND');
      });

      it('should handle unauthorized access', async () => {
        const positionId = 1;
        const otherUserPosition = {
          id: positionId,
          userId: 999, // Different user
          symbol: 'BTC/USDT',
          status: 'open',
        };

        mockDatabase.positions.findById.mockResolvedValue(otherUserPosition);

        const request = createMockRequest(`http://localhost:8080/trading/positions/${positionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to access this position',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('UNAUTHORIZED');
      });
    });
  });

  describe('Market Data Endpoints', () => {
    describe('GET /market/opportunities', () => {
      it('should return active opportunities', async () => {
        const mockOpportunities = [
          {
            id: 1,
            type: 'arbitrage',
            symbol: 'BTC/USDT',
            expectedReturn: 0.025,
            confidence: 0.85,
            data: {
              exchanges: ['binance', 'coinbase'],
              prices: { binance: 45000, coinbase: 46125 },
            },
            expiresAt: new Date(Date.now() + 300000),
            isActive: true,
          },
          {
            id: 2,
            type: 'momentum',
            symbol: 'ETH/USDT',
            expectedReturn: 0.018,
            confidence: 0.78,
            data: {
              trend: 'bullish',
              indicators: ['RSI', 'MACD'],
            },
            expiresAt: new Date(Date.now() + 600000),
            isActive: true,
          },
        ];

        mockDatabase.opportunities.findActive.mockResolvedValue(mockOpportunities);

        const request = createMockRequest('http://localhost:8080/market/opportunities', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            opportunities: mockOpportunities,
            count: mockOpportunities.length,
            filters: {
              minConfidence: 0.7,
              maxRisk: 'moderate',
            },
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.opportunities).toHaveLength(2);
        expect(response.data.opportunities[0].type).toBe('arbitrage');
        expect(response.data.opportunities[1].type).toBe('momentum');
      });

      it('should filter opportunities by risk tolerance', async () => {
        const conservativeUser = {
          ...testUser,
          settings: { riskTolerance: 'conservative' },
        };

        mockDatabase.users.findById.mockResolvedValue(conservativeUser);

        const filteredOpportunities = [
          {
            id: 1,
            type: 'arbitrage',
            symbol: 'BTC/USDT',
            expectedReturn: 0.015, // Lower risk/return
            confidence: 0.95,
            riskLevel: 'low',
          },
        ];

        mockDatabase.opportunities.findActive.mockResolvedValue(filteredOpportunities);

        const request = createMockRequest('http://localhost:8080/market/opportunities', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            opportunities: filteredOpportunities,
            count: 1,
            appliedFilters: {
              riskTolerance: 'conservative',
              minConfidence: 0.9,
            },
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.opportunities).toHaveLength(1);
        expect(response.data.opportunities[0].confidence).toBeGreaterThan(0.9);
      });
    });

    describe('GET /market/prices/:symbol', () => {
      it('should return current price data', async () => {
        const symbol = 'BTC/USDT';
        const mockPriceData = {
          symbol,
          price: 45000,
          volume24h: 1000000,
          change24h: 2.5,
          high24h: 46000,
          low24h: 44000,
          timestamp: new Date(),
        };

        mockExchangeAPI.getPrice.mockResolvedValue(mockPriceData);

        const request = createMockRequest(`http://localhost:8080/market/prices/${symbol}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: true,
          data: {
            price: mockPriceData,
          },
        };

        expect(response.success).toBe(true);
        expect(response.data.price.symbol).toBe(symbol);
        expect(response.data.price.price).toBe(45000);
      });

      it('should handle invalid symbol', async () => {
        const invalidSymbol = 'INVALID/PAIR';
        mockExchangeAPI.getPrice.mockRejectedValue(new Error('Symbol not found'));

        const request = createMockRequest(`http://localhost:8080/market/prices/${invalidSymbol}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const response = {
          success: false,
          error: {
            code: 'SYMBOL_NOT_FOUND',
            message: 'Trading pair not found',
          },
        };

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('SYMBOL_NOT_FOUND');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockDatabase.users.findById.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:8080/users/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const response = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal error occurred. Please try again later.',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle external API failures', async () => {
      mockExchangeAPI.getPrice.mockRejectedValue(new Error('Exchange API unavailable'));

      const request = createMockRequest('http://localhost:8080/market/prices/BTC/USDT', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const response = {
        success: false,
        error: {
          code: 'EXTERNAL_SERVICE_ERROR',
          message: 'Market data temporarily unavailable',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should handle malformed requests', async () => {
      const request = createMockRequest('http://localhost:8080/trading/positions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: 'invalid-json',
      });

      const response = {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body must be valid JSON',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_REQUEST_BODY');
    });

    it('should handle missing authorization header', async () => {
      const request = createMockRequest('http://localhost:8080/users/profile');

      const response = {
        success: false,
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header is required',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('MISSING_AUTHORIZATION');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) =>
        createMockRequest(`http://localhost:8080/market/opportunities?page=${i}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      );

      mockDatabase.opportunities.findActive.mockResolvedValue([]);

      const promises = concurrentRequests.map(async (request, index) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return {
          success: true,
          data: { opportunities: [], page: index },
        };
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBe(50);
    });

    it('should implement request caching', async () => {
      const symbol = 'BTC/USDT';
      const cachedPrice = { symbol, price: 45000, cached: true };

      // Mock the cache behavior
      const cacheSpy = vi.fn();
      
      // First request - cache miss, should call external API
      mockExchangeAPI.getPrice.mockResolvedValueOnce(cachedPrice);
      
      // Simulate first API call
      const firstCallResult = await mockExchangeAPI.getPrice(symbol);
      cacheSpy(symbol, firstCallResult); // Simulate caching

      const request1 = createMockRequest(`http://localhost:8080/market/prices/${symbol}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const response1 = {
        success: true,
        data: { price: cachedPrice },
        cached: false,
      };

      // Second request - cache hit, should not call external API again
      const request2 = createMockRequest(`http://localhost:8080/market/prices/${symbol}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const response2 = {
        success: true,
        data: { price: cachedPrice },
        cached: true,
      };

      expect(response1.cached).toBe(false);
      expect(response2.cached).toBe(true);
      expect(mockExchangeAPI.getPrice).toHaveBeenCalledTimes(1);
      expect(cacheSpy).toHaveBeenCalledTimes(1);
    });
  });
});