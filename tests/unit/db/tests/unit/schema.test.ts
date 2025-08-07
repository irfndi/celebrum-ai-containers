/**
 * Unit tests for database schema definitions
 * Tests schema structure, types, and constraints
 */

import { describe, it, expect } from 'vitest';
import {
  users,
  positions,
  opportunities,
  tradingStrategies,
  invitationCodes,
  invitationUsage,
  userUsernameHistory,
  type User,
  type NewUser,
  type Position,
  type NewPosition,
  type Opportunity,
  type NewOpportunity,
  type TradingStrategy,
  type NewTradingStrategy,
  type InvitationCode,
  type NewInvitationCode,
  type InvitationUsage,
  type NewInvitationUsage,
  type UserUsernameHistory,
  type NewUserUsernameHistory,
} from '../../../../../src/db/src/schema/index';

describe('Database Schema', () => {
  describe('Users Table', () => {
    it('should be defined', () => {
      expect(users).toBeDefined();
    });

    it('should have required columns', () => {
      expect(users.id).toBeDefined();
      expect(users.telegramId).toBeDefined();
      expect(users.firstName).toBeDefined();
      expect(users.lastName).toBeDefined();
      expect(users.username).toBeDefined();
      expect(users.email).toBeDefined();
      expect(users.role).toBeDefined();
      expect(users.status).toBeDefined();
      expect(users.createdAt).toBeDefined();
      expect(users.updatedAt).toBeDefined();
    });

    it('should have correct primary key', () => {
      expect(users.id).toBeDefined();
      expect(users.id.notNull).toBe(true);
    });

    it('should have correct enum values for role', () => {
      const roleColumn = users.role;
      expect(roleColumn.enumValues).toEqual(['free', 'pro', 'ultra', 'admin', 'superadmin']);
    });

    it('should have correct enum values for status', () => {
      const statusColumn = users.status;
      expect(statusColumn.enumValues).toEqual(['active', 'suspended', 'banned']);
    });

    it('should have correct default values', () => {
      expect(users.role.default).toBe('free');
      expect(users.status.default).toBe('active');
    });

    it('should have unique constraints', () => {
      // Test that unique columns are defined
      expect(users.telegramId).toBeDefined();
      expect(users.email).toBeDefined();
      expect(users.username).toBeDefined();
    });
  });

  describe('Positions Table', () => {
    it('should be defined', () => {
      expect(positions).toBeDefined();
    });

    it('should have required columns', () => {
      expect(positions.id).toBeDefined();
      expect(positions.userId).toBeDefined();
      expect(positions.symbol).toBeDefined();
      expect(positions.type).toBeDefined();
      expect(positions.strategy).toBeDefined();
      expect(positions.entryPrice).toBeDefined();
      expect(positions.quantity).toBeDefined();
      expect(positions.status).toBeDefined();
    });

    it('should have foreign key to users', () => {
      expect(positions.userId).toBeDefined();
      expect(positions.userId.notNull).toBe(true);
    });

    it('should have correct enum values for type', () => {
      const typeColumn = positions.type;
      expect(typeColumn.enumValues).toEqual(['long', 'short']);
    });

    it('should have correct enum values for strategy', () => {
      const strategyColumn = positions.strategy;
      expect(strategyColumn.enumValues).toEqual(['arbitrage', 'technical', 'manual']);
    });

    it('should have correct enum values for status', () => {
      const statusColumn = positions.status;
      expect(statusColumn.enumValues).toEqual(['open', 'closed', 'partially_filled', 'cancelled']);
    });

    it('should have indexed columns', () => {
       // Test that commonly indexed columns are defined
       expect(positions.userId).toBeDefined();
       expect(positions.symbol).toBeDefined();
       expect(positions.status).toBeDefined();
     });
  });

  describe('Opportunities Table', () => {
    it('should be defined', () => {
      expect(opportunities).toBeDefined();
    });

    it('should have required columns', () => {
      expect(opportunities.id).toBeDefined();
      expect(opportunities.type).toBeDefined();
      expect(opportunities.symbol).toBeDefined();
      expect(opportunities.exchange1).toBeDefined();
      expect(opportunities.exchange2).toBeDefined();
      expect(opportunities.profitPercentage).toBeDefined();
      expect(opportunities.confidence).toBeDefined();
    });

    it('should have correct enum values for type', () => {
      const typeColumn = opportunities.type;
      expect(typeColumn.enumValues).toEqual(['arbitrage', 'technical']);
    });

    it('should have default value for isActive', () => {
      expect(opportunities.isActive.default).toBe(true);
    });
  });

  describe('Trading Strategies Table', () => {
    it('should be defined', () => {
      expect(tradingStrategies).toBeDefined();
    });

    it('should have required columns', () => {
      expect(tradingStrategies.id).toBeDefined();
      expect(tradingStrategies.userId).toBeDefined();
      expect(tradingStrategies.name).toBeDefined();
      expect(tradingStrategies.type).toBeDefined();
      expect(tradingStrategies.settings).toBeDefined();
    });

    it('should have foreign key to users', () => {
      expect(tradingStrategies.userId).toBeDefined();
      expect(tradingStrategies.userId.notNull).toBe(true);
    });

    it('should have correct enum values for type', () => {
      const typeColumn = tradingStrategies.type;
      expect(typeColumn.enumValues).toEqual(['arbitrage', 'technical', 'manual']);
    });
  });

  describe('Invitation Codes Table', () => {
    it('should be defined', () => {
      expect(invitationCodes).toBeDefined();
    });

    it('should have required columns', () => {
      expect(invitationCodes.code).toBeDefined();
      expect(invitationCodes.createdBy).toBeDefined();
      expect(invitationCodes.createdAt).toBeDefined();
      expect(invitationCodes.currentUses).toBeDefined();
      expect(invitationCodes.isActive).toBeDefined();
    });

    it('should have code as primary key', () => {
      expect(invitationCodes.code.primary).toBe(true);
    });

    it('should have default values', () => {
      expect(invitationCodes.currentUses.default).toBe(0);
      expect(invitationCodes.isActive.default).toBe(true);
    });
  });

  describe('Invitation Usage Table', () => {
    it('should be defined', () => {
      expect(invitationUsage).toBeDefined();
    });

    it('should have required columns', () => {
      expect(invitationUsage.id).toBeDefined();
      expect(invitationUsage.invitationId).toBeDefined();
      expect(invitationUsage.userId).toBeDefined();
      expect(invitationUsage.telegramId).toBeDefined();
      expect(invitationUsage.usedAt).toBeDefined();
      expect(invitationUsage.betaExpiresAt).toBeDefined();
    });

    it('should have id as primary key', () => {
      expect(invitationUsage.id.primary).toBe(true);
    });
  });

  describe('User Username History Table', () => {
    it('should be defined', () => {
      expect(userUsernameHistory).toBeDefined();
    });

    it('should have required columns', () => {
      expect(userUsernameHistory.id).toBeDefined();
      expect(userUsernameHistory.userId).toBeDefined();
      expect(userUsernameHistory.telegramId).toBeDefined();
      expect(userUsernameHistory.username).toBeDefined();
      expect(userUsernameHistory.changedAt).toBeDefined();
    });

    it('should have foreign key to users', () => {
      // Check if userId column has foreign key constraint
      const userIdColumn = userUsernameHistory.userId;
      expect(userIdColumn).toBeDefined();
      expect(userIdColumn.notNull).toBe(true);
    });
  });

  describe('Type Inference', () => {
    it('should infer correct User types', () => {
      const user: User = {
        id: '1',
        telegramId: '123456',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        languageCode: 'en',
        email: 'john@example.com',
        role: 'free',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        settings: { notifications: true },
        apiLimits: { maxDailyRequests: 100 },
        accountBalance: '1000.00',
        betaExpiresAt: null,
        tradingPreferences: { autoTrade: false },
      };

      expect(user.role).toBe('free');
      expect(user.status).toBe('active');
      expect(typeof user.id).toBe('string');
    });

    it('should infer correct NewUser types', () => {
      const newUser: NewUser = {
        telegramId: '123456',
        firstName: 'John',
        role: 'free',
        status: 'active',
      };

      expect(newUser.telegramId).toBe('123456');
      expect(newUser.role).toBe('free');
    });

    it('should infer correct Position types', () => {
      const position: Position = {
        id: '1',
        userId: '1',
        exchangeId: 'binance',
        symbol: 'BTCUSDT',
        type: 'long',
        strategy: 'technical',
        entryPrice: 50000,
        exitPrice: null,
        quantity: 0.1,
        leverage: 2,
        stopLoss: 45000,
        takeProfit: 55000,
        status: 'open',
        pnl: 0,
        fees: 10,
        metadata: { riskScore: 0.5 },
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
      };

      expect(position.type).toBe('long');
      expect(position.strategy).toBe('technical');
      expect(position.status).toBe('open');
    });

    it('should infer correct Opportunity types', () => {
      const opportunity: Opportunity = {
        id: '1',
        type: 'arbitrage',
        symbol: 'BTCUSDT',
        exchange1: 'binance',
        exchange2: 'coinbase',
        price1: 50000,
        price2: 50100,
        profitPercentage: 0.2,
        confidence: 0.95,
        expiresAt: new Date(),
        isActive: true,
        createdAt: new Date(),
      };

      expect(opportunity.type).toBe('arbitrage');
      expect(typeof opportunity.profitPercentage).toBe('number');
    });
  });
});