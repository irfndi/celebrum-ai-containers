import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArbitrageDetector, type ArbitrageOpportunity, type ExchangePrice } from '../../../../../../src/services/src/opportunities/src/arbitrage-detector';
import type { Env } from '@celebrum-ai/shared';
import type { ExtendedKVNamespace } from '../../../../../../src/shared/src/types';
import { getTestDb, createMockEnv } from '../../../../../../src/shared/tests/fixtures';

describe('ArbitrageDetector', () => {
  let detector: ArbitrageDetector;
  let db: any;
  let kv: ExtendedKVNamespace;
  let mockEnv: Env;

  beforeEach(async () => {
    const testDb = await getTestDb();
    db = testDb.db;
    kv = testDb.kv as ExtendedKVNamespace;
    mockEnv = await createMockEnv();
    mockEnv.DB = db;
    mockEnv.CELEBRUM_KV = kv;
    detector = new ArbitrageDetector(mockEnv);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectOpportunities', () => {
    it('should detect arbitrage opportunities with sufficient spread', async () => {
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50300, // 0.6% spread
          volume: 800,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0]).toMatchObject({
        symbol: 'BTC/USDT',
        buyExchange: 'binance',
        sellExchange: 'coinbase',
        buyPrice: 50000,
        sellPrice: 50300,
        spread: 300,
        spreadPercentage: 0.6
      });
      expect(opportunities[0].id).toBeDefined();
      expect(opportunities[0].estimatedProfit).toBeGreaterThan(0);
      expect(opportunities[0].confidence).toBeGreaterThan(0);
    });

    it('should not detect opportunities with insufficient spread', async () => {
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50100, // 0.2% spread (below 0.5% minimum)
          volume: 800,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities).toHaveLength(0);
    });

    it('should filter out stale prices', async () => {
      const staleTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: staleTimestamp // Stale price
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50300,
          volume: 800,
          timestamp: new Date().toISOString() // Fresh price
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities).toHaveLength(0); // No opportunities due to stale data
    });

    it('should handle multiple symbols correctly', async () => {
      const prices: ExchangePrice[] = [
        // BTC/USDT with good spread
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50300,
          volume: 800,
          timestamp: new Date().toISOString()
        },
        // ETH/USDT with insufficient spread
        {
          exchange: 'binance',
          symbol: 'ETH/USDT',
          price: 3000,
          volume: 500,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'ETH/USDT',
          price: 3005, // 0.17% spread (below minimum)
          volume: 400,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].symbol).toBe('BTC/USDT');
    });

    it('should calculate estimated profit correctly', async () => {
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50500, // 1% spread
          volume: 800,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities).toHaveLength(1);
      const opportunity = opportunities[0];
      
      // Expected calculation: (spread * volume) - (volume * 0.002 trading fees)
      // (500 * 800) - (800 * 0.002) = 400000 - 1.6 = 399998.4
      expect(opportunity.estimatedProfit).toBeCloseTo(399998.4, 1); // Close to expected value
      expect(opportunity.volume).toBe(800); // Should use minimum volume
    });

    it('should calculate confidence score based on spread and volume', async () => {
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 5000, // High volume
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 52500, // 5% spread (high spread)
          volume: 5000,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities).toHaveLength(1);
      const opportunity = opportunities[0];
      
      // High spread (5%) and high volume should result in high confidence
      expect(opportunity.confidence).toBeGreaterThan(0.8);
    });

    it('should generate unique opportunity IDs', async () => {
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50300,
          volume: 800,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'kraken',
          symbol: 'BTC/USDT',
          price: 50400,
          volume: 900,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);

      expect(opportunities.length).toBeGreaterThan(1);
      const ids = opportunities.map((opp: ArbitrageOpportunity) => opp.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });
  });

  describe('configuration methods', () => {
    it('should allow setting minimum spread percentage', async () => {
      detector.setMinSpreadPercentage(1.0); // Set to 1%

      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: new Date().toISOString()
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50300, // 0.6% spread (below new 1% minimum)
          volume: 800,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);
      expect(opportunities).toHaveLength(0);
    });

    it('should allow setting maximum opportunity age', async () => {
      detector.setMaxOpportunityAge(10000); // 10 seconds

      const oldTimestamp = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago
      const prices: ExchangePrice[] = [
        {
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: 50000,
          volume: 1000,
          timestamp: oldTimestamp
        },
        {
          exchange: 'coinbase',
          symbol: 'BTC/USDT',
          price: 50300,
          volume: 800,
          timestamp: new Date().toISOString()
        }
      ];

      const opportunities = await detector.detectOpportunities(prices);
      expect(opportunities).toHaveLength(0); // Should filter out old prices
    });
  });
});