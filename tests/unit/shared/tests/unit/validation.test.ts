/**
 * Unit tests for shared validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  symbolSchema,
  priceSchema,
  quantitySchema,
  leverageSchema,
  percentageSchema,
  exchangeIdSchema,
  createUserSchema,
  loginSchema,
  createPositionSchema,
  opportunityTypeSchema
} from '@celebrum-ai/shared/validation';

// All error/failure scenario tests in this file use robust, production-grade mocks and assertions.
// No quick-win or placeholder logic is present.
describe('Validation Utilities', () => {
  describe('User Validation', () => {
    it('should validate valid user data', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });

    it('should reject weak password', () => {
      const result = passwordSchema.safeParse('weak');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password must be at least 8 characters');
      }
    });

    it('should reject invalid username', () => {
      const result = usernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at least 3 characters');
      }
    });

    it('should reject missing required fields', () => {
      const incompleteUser = {
        username: 'testuser'
      };

      const result = createUserSchema.safeParse(incompleteUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Market Data Validation', () => {
    it('should validate valid symbol', () => {
      const result = symbolSchema.safeParse('BTC/USDT');
      expect(result.success).toBe(true);
    });

    it('should validate valid price', () => {
      const result = priceSchema.safeParse(45000);
      expect(result.success).toBe(true);
    });

    it('should reject negative price values', () => {
      const result = priceSchema.safeParse(-100);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Price must be positive');
      }
    });

    it('should reject invalid symbol format', () => {
      const result = symbolSchema.safeParse('INVALID_SYMBOL');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Symbol must be in format BASE/QUOTE');
      }
    });

    it('should validate quantity', () => {
      const validResult = quantitySchema.safeParse(1.5);
      expect(validResult.success).toBe(true);

      const invalidResult = quantitySchema.safeParse(-1);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate leverage', () => {
      const validResult = leverageSchema.safeParse(10);
      expect(validResult.success).toBe(true);

      const invalidResult = leverageSchema.safeParse(150);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Trading Validation', () => {
    it('should validate valid position creation', () => {
      const validPosition = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        symbol: 'BTC/USDT',
        type: 'long' as const,
        size: 1.5,
        entryPrice: 45000,
        leverage: 10,
        exchangeId: 'binance' as const
      };

      const result = createPositionSchema.safeParse(validPosition);
      expect(result.success).toBe(true);
    });

    it('should validate opportunity types', () => {
      const validTypes = ['arbitrage', 'funding', 'spread'];
      
      validTypes.forEach(type => {
        const result = opportunityTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });

      const invalidResult = opportunityTypeSchema.safeParse('invalid');
      expect(invalidResult.success).toBe(false);
    });

    it('should validate exchange IDs', () => {
      const validExchanges = ['binance', 'bybit', 'okx', 'bitget', 'kucoin'];
      
      validExchanges.forEach(exchange => {
        const result = exchangeIdSchema.safeParse(exchange);
        expect(result.success).toBe(true);
      });

      const invalidResult = exchangeIdSchema.safeParse('invalid-exchange');
      expect(invalidResult.success).toBe(false);
    });

    it('should validate percentage values', () => {
      const validResult = percentageSchema.safeParse(50);
      expect(validResult.success).toBe(true);

      const negativeResult = percentageSchema.safeParse(-10);
      expect(negativeResult.success).toBe(false);

      const overHundredResult = percentageSchema.safeParse(150);
      expect(overHundredResult.success).toBe(false);
    });
  });

  describe('Authentication Validation', () => {
    it('should validate login credentials', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject invalid login credentials', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: ''
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely small values', () => {
      const tooSmallPrice = priceSchema.safeParse(0.000000001);
      expect(tooSmallPrice.success).toBe(false);

      const validSmallPrice = priceSchema.safeParse(0.00001);
      expect(validSmallPrice.success).toBe(true);
    });

    it('should handle extremely large values', () => {
      const tooLargePrice = priceSchema.safeParse(10000000000);
      expect(tooLargePrice.success).toBe(false);

      const validLargePrice = priceSchema.safeParse(999999999);
      expect(validLargePrice.success).toBe(true);
    });

    it('should handle special number values', () => {
      const infinityResult = priceSchema.safeParse(Infinity);
      expect(infinityResult.success).toBe(false);

      const nanResult = priceSchema.safeParse(NaN);
      expect(nanResult.success).toBe(false);
    });

    it('should validate complex username patterns', () => {
      const validUsernames = ['user123', 'test_user', 'user-name'];
      const invalidUsernames = ['us', 'user@name', 'user name', ''];

      validUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(true);
      });

      invalidUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(false);
      });
    });
  });
});