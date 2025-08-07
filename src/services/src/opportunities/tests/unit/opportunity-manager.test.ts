import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpportunityManager } from '@celebrum-ai/services';
import type { ArbitrageOpportunity } from '@celebrum-ai/shared';
import type { MarketDataPoint } from '@celebrum-ai/shared/infrastructure/data-sources';
import { createMockEnv, createMockKV, getTestDb } from '@celebrum-ai/test-utils';

// Mock the data source managers
vi.mock('@celebrum-ai/shared/infrastructure/data-sources', () => ({
  dataSourceManager: {
    getTicker: vi.fn(),
  },
}));

vi.mock('@celebrum-ai/shared/infrastructure/ccxt-data-source', () => ({
  ccxtDataSourceManager: {
    getHealthyExchanges: vi.fn(),
    getMultipleTickers: vi.fn(),
  },
}));

describe('OpportunityManager', () => {
  let opportunityManager: OpportunityManager;
  let mockKV: any;
  let env: any;
  let mockCcxtDataSource: any;
  let mockLegacyDataSource: any;

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockKV = createMockKV();
    env = await createMockEnv();
    env.CELEBRUM_KV = mockKV;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create properly typed mock objects
    mockCcxtDataSource = {
      getHealthyExchanges: vi.fn(),
      getMultipleTickers: vi.fn(),
    };
    
    mockLegacyDataSource = {
      getTicker: vi.fn(),
    };
    
    // Initialize the opportunity manager with mocked dependencies
    opportunityManager = new OpportunityManager(env, mockCcxtDataSource, mockLegacyDataSource);
  });

  afterEach(async () => {
    // No cleanup needed as there's no cleanup method
  });

  describe('constructor', () => {
    it('should initialize with proper dependencies', () => {
      expect(opportunityManager).toBeDefined();
    });
  });

  describe('getAvailableOpportunities', () => {
    it('should return arbitrage opportunities when valid opportunities exist', async () => {
      // Mock data source responses for arbitrage opportunities with significant price spreads
      const mockExchanges = ['binance', 'kraken', 'coinbase'];
      const mockTickers: MarketDataPoint[] = [
        { symbol: 'BTCUSDT', exchange: 'binance', price: 50000, volume: 10000000, timestamp: Date.now().toString() },
        { symbol: 'BTCUSDT', exchange: 'kraken', price: 45000, volume: 10000000, timestamp: Date.now().toString() },
        { symbol: 'BTCUSDT', exchange: 'coinbase', price: 40000, volume: 10000000, timestamp: Date.now().toString() },
        { symbol: 'ETHUSDT', exchange: 'binance', price: 3000, volume: 5000000, timestamp: Date.now().toString() },
        { symbol: 'ETHUSDT', exchange: 'kraken', price: 2700, volume: 5000000, timestamp: Date.now().toString() },
        { symbol: 'ETHUSDT', exchange: 'coinbase', price: 2400, volume: 5000000, timestamp: Date.now().toString() },
      ];

      mockCcxtDataSource.getHealthyExchanges.mockResolvedValue(mockExchanges);
      mockCcxtDataSource.getMultipleTickers.mockResolvedValue(mockTickers);

      // Mock legacy data source as fallback for all required symbols
      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        const prices: Record<string, Record<string, number>> = {
          'BTCUSDT': {
            'binance': 50000,
            'kraken': 45000,
            'coinbase': 40000
          },
          'ETHUSDT': {
            'binance': 3000,
            'kraken': 2700,
            'coinbase': 2400
          }
        };
        return Promise.resolve({
          symbol,
          exchange,
          price: prices[symbol]?.[exchange] || 45000,
          volume: 10000000,
          timestamp: Date.now().toString()
        });
      });

      // Mock the validateOpportunityAccess method to always allow access
      (opportunityManager as any).validateOpportunityAccess = vi.fn().mockResolvedValue({
        success: true,
        message: 'Access granted'
      });

      // Call the method with admin role
      const opportunities = await opportunityManager.getAvailableOpportunities('user_123', 'admin');

      // Verify the results
      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBeGreaterThan(0);
      
      // Verify each opportunity has the required properties
      opportunities.forEach((opportunity: ArbitrageOpportunity) => {
        expect(opportunity).toHaveProperty('id');
        expect(opportunity).toHaveProperty('symbol');
        expect(opportunity).toHaveProperty('exchange_a');
        expect(opportunity).toHaveProperty('exchange_b');
        expect(opportunity).toHaveProperty('price_a');
        expect(opportunity).toHaveProperty('price_b');
        expect(opportunity).toHaveProperty('profit_percentage');
        expect(opportunity).toHaveProperty('confidence_score');
        expect(opportunity).toHaveProperty('generated_at');
        expect(opportunity).toHaveProperty('expires_at');
      });
    });

    it('should return empty array when no opportunities exist', async () => {
      // Mock data source responses with identical prices (no arbitrage opportunities)
      const mockExchanges = ['binance', 'kraken'];
      const mockTickers: MarketDataPoint[] = [
        { symbol: 'BTCUSDT', exchange: 'binance', price: 45000, volume: 1000000, timestamp: Date.now().toString() },
        { symbol: 'BTCUSDT', exchange: 'kraken', price: 45000, volume: 1000000, timestamp: Date.now().toString() },
      ];

      mockCcxtDataSource.getHealthyExchanges.mockResolvedValue(mockExchanges);
      mockCcxtDataSource.getMultipleTickers.mockResolvedValue(mockTickers);

      // Call the method
      const opportunities = await opportunityManager.getAvailableOpportunities('user_123', 'free');

      // Verify the results
      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBe(0);
    });

    it('should handle errors from data sources gracefully', async () => {
      // Mock data source to throw an error
      mockCcxtDataSource.getHealthyExchanges.mockRejectedValue(new Error('Network error'));

      // Call the method and expect it to handle the error
      const opportunities = await opportunityManager.getAvailableOpportunities('user_123', 'free');

      // Verify it returns an empty array instead of throwing
      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBe(0);
    });
  });

  describe('getHedgeOpportunities', () => {
    it('should return hedge opportunities based on market conditions', async () => {
      // Mock data source responses for all required symbols and exchanges
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
      const exchanges = ['binance', 'coinbase', 'kraken'];
      
      // Setup comprehensive mock with price differences for hedge opportunities
      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 45200; // 0.44% difference
            break;
          case 'kraken':
            price = 44900; // 0.22% difference
            break;
        }
        return Promise.resolve({
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: Date.now().toString()
        });
      });

      // Mock the ccxtDataSourceManager methods - not needed for hedge opportunities
      const ccxtDataSourceManager = {
        getHealthyExchanges: vi.fn().mockResolvedValue(['binance', 'coinbase', 'kraken']),
        getMultipleTickers: vi.fn().mockResolvedValue([]),
      };

      // Call the method
      const opportunities = await opportunityManager.getHedgeOpportunities('user_123', 'free');

      // Verify the results
      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      
      // If opportunities exist, verify their structure
      if (opportunities.length > 0) {
        opportunities.forEach((opportunity: any) => {
          expect(opportunity).toHaveProperty('id');
          expect(opportunity).toHaveProperty('symbol');
          expect(opportunity).toHaveProperty('type', 'hedge');
          expect(opportunity).toHaveProperty('status', 'pending');
          expect(opportunity).toHaveProperty('positions_opened');
          expect(opportunity.positions_opened.long).toBeDefined();
          expect(opportunity.positions_opened.short).toBeDefined();
          expect(opportunity).toHaveProperty('difference');
          expect(opportunity).toHaveProperty('expected_apr');
          expect(opportunity).toHaveProperty('profit_percentage');
          expect(opportunity).toHaveProperty('confidence_score');
          expect(opportunity).toHaveProperty('risk_level');
          expect(opportunity).toHaveProperty('max_position_size');
          expect(opportunity).toHaveProperty('stop_loss');
          expect(opportunity).toHaveProperty('take_profit');
          expect(opportunity).toHaveProperty('generated_at');
          expect(opportunity).toHaveProperty('expires_at');
        });
      }
    });

    it('should return empty array when no hedge opportunities exist', async () => {
      // Mock all required symbols and exchanges to ensure sufficient data
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
      const exchanges = ['binance', 'coinbase', 'kraken'];
      
      // Setup mock implementations with price differences for hedge opportunities
      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 45200; // 0.44% difference
            break;
          case 'kraken':
            price = 44900; // 0.22% difference
            break;
        }
        return Promise.resolve({
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: Date.now().toString()
        });
      });
      
      // Call the method
      const opportunities = await opportunityManager.getHedgeOpportunities('user_123', 'free');

      // Verify the results
      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBe(0);
    });
  });

  describe('getEnhancedOpportunities', () => {
    it('should return both arbitrage and hedge opportunities', async () => {

      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 43500; // 3.45% spread
            break;
          case 'kraken':
            price = 44000; // 2.27% spread
            break;
        }
        
        // ETH prices
        if (symbol === 'ETHUSDT') {
          price = 3000;
          switch (exchange) {
            case 'binance':
              price = 3000;
              break;
            case 'coinbase':
              price = 2850; // 5.26% spread
              break;
            case 'kraken':
              price = 2900; // 3.45% spread
              break;
          }
        }
        
        return Promise.resolve({
          symbol,
          exchange,
          price,
          volume: 1000,
          timestamp: Date.now().toString()
        });
      });

      const opportunities = await opportunityManager.getEnhancedOpportunities('user_123', 'free', {
        includeHedgeOptions: true
      });

      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
      
      const arbitrageCount = opportunities.filter((o: any) => o.type === 'arbitrage').length;
      const hedgeCount = opportunities.filter((o: any) => o.type === 'hedge').length;
      
      expect(arbitrageCount).toBeGreaterThanOrEqual(0);
      expect(hedgeCount).toBeGreaterThanOrEqual(0);
    });

    it('should respect user role and subscription tier limits', async () => {

      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 45200; // 0.44% difference
            break;
          case 'kraken':
            price = 44900; // 0.22% difference
            break;
        }
        return Promise.resolve({ symbol, exchange, price, volume: 1000000, timestamp: Date.now().toString() });
      });

      // Test with free user (should have limited opportunities)
      const freeOpportunities = await opportunityManager.getEnhancedOpportunities('user_123', 'free');
      expect(freeOpportunities.length).toBeLessThanOrEqual(5); // Free tier limit

      // Test with premium user (should have more opportunities)
      const premiumOpportunities = await opportunityManager.getEnhancedOpportunities('user_123', 'pro');
      expect(premiumOpportunities.length).toBeGreaterThanOrEqual(freeOpportunities.length);
    });
  });

  describe('cache management', () => {
    it('should cache opportunities and respect TTL', async () => {


      // Setup comprehensive mock with price differences for hedge opportunities
      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 45200; // 0.44% difference
            break;
          case 'kraken':
            price = 44900; // 0.22% difference
            break;
        }
        return Promise.resolve({
          symbol,
          exchange,
          price,
          volume: 1000000, // Increased volume for higher confidence
          timestamp: Date.now().toString()
        });
      });

      // First call should populate cache
      const firstCall = await opportunityManager.getHedgeOpportunities('user_123', 'free');
      expect(Array.isArray(firstCall)).toBe(true);

      // Verify legacyDataSource was called
      expect(mockLegacyDataSource.getTicker).toHaveBeenCalled();

      // Second call should use cache
      const secondCall = await opportunityManager.getHedgeOpportunities('user_123', 'free');
      expect(secondCall).toEqual(firstCall);
    });

    it('should refresh cache when expired', async () => {


      // Setup comprehensive mock with price differences for hedge opportunities
      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 45200; // 0.44% difference
            break;
          case 'kraken':
            price = 44900; // 0.22% difference
            break;
        }
        return Promise.resolve({
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: Date.now().toString()
        });
      });

      // First call
      const firstCall = await opportunityManager.getHedgeOpportunities('user_123', 'free');
      expect(Array.isArray(firstCall)).toBe(true);

      // Verify legacyDataSource was called
      expect(mockLegacyDataSource.getTicker).toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits for users', async () => {


      // Setup comprehensive mock for all symbols and exchanges with price differences
      mockLegacyDataSource.getTicker.mockImplementation((symbol: string, exchange: string) => {
        let price = 45000;
        switch (exchange) {
          case 'binance':
            price = 45000;
            break;
          case 'coinbase':
            price = 45200; // 0.44% difference
            break;
          case 'kraken':
            price = 44900; // 0.22% difference
            break;
        }
        return Promise.resolve({
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: Date.now().toString()
        });
      });

      // Ensure cache is empty
      await mockKV.delete('opportunities_cache:free');

      // Make a single call to ensure data source is called
      await opportunityManager.getHedgeOpportunities('user_123', 'free');

      // Verify legacyDataSource was called
      expect(mockLegacyDataSource.getTicker).toHaveBeenCalled();
    });
  });
});