/**
 * Unit tests for CCXT Data Source
 * Tests CCXT integration, data fetching, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { CCXTDataSource } from '@celebrum-ai/shared/infrastructure/ccxt-data-source';
import type { Trade, OrderBook } from '@celebrum-ai/shared/types/market';
import { setupRobustCCXTMock } from '../../../../../src/shared/tests/utils/enhanced-mock';

beforeAll(() => {
  setupRobustCCXTMock();
});


describe('CCXTDataSource', () => {
  let dataSource: CCXTDataSource;
  let mockExchange: any;

  beforeEach(() => {
      dataSource = new CCXTDataSource('binance', {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        sandbox: true
      });
      mockExchange = (dataSource as any).exchange;
      // Ensure mock methods are properly set up
      mockExchange.loadMarkets = vi.fn().mockResolvedValue({});
      mockExchange.fetchTicker = vi.fn();
      mockExchange.fetchOrderBook = vi.fn();
      mockExchange.fetchTrades = vi.fn();
      mockExchange.fetchOHLCV = vi.fn();
    });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create instance with correct exchange ID', () => {
      expect(dataSource.getName()).toBe('binance');
    });

    it('should initialize with sandbox mode', () => {
      const sandboxDataSource = new CCXTDataSource('binance', {
        sandbox: true
      });
      expect(sandboxDataSource.getName()).toBe('binance');
    });

    it('should get capabilities', () => {
      const capabilities = dataSource.getCapabilities();
      // Only check the capabilities we care about
      expect(capabilities.fetchTicker).toBe(true);
      expect(capabilities.fetchOrderBook).toBe(true);
      expect(capabilities.fetchTrades).toBe(true);
      expect(capabilities.fetchOHLCV).toBe(true);
      expect(capabilities.fetchMarkets).toBe(true);
    });
  });

  describe('getTicker', () => {
    it('should fetch ticker data successfully', async () => {
      const mockTickerData = {
        symbol: 'BTC/USDT',
        last: 50000,
        baseVolume: 1000,
        bid: 49950,
        ask: 50050,
        high: 51000,
        low: 49000,
        timestamp: Date.now()
      };

      mockExchange.fetchTicker.mockResolvedValue(mockTickerData);

      const result = await dataSource.getTicker('BTC/USDT');

      expect(result).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        price: 50000,
        volume: 1000,
        bid: 49950,
        ask: 50050,
        high24h: 51000,
        low24h: 49000,
        timestamp: expect.any(String)
      });

      expect(mockExchange.loadMarkets).toHaveBeenCalled();
      expect(mockExchange.fetchTicker).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should handle missing ticker data gracefully', async () => {
      const mockTickerData = {
        symbol: 'BTC/USDT',
        last: undefined,
        baseVolume: undefined,
        bid: undefined,
        ask: undefined,
        high: undefined,
        low: undefined,
        timestamp: undefined
      };

      mockExchange.fetchTicker.mockResolvedValue(mockTickerData);

      const result = await dataSource.getTicker('BTC/USDT');

      expect(result).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        price: 0,
        volume: 0,
        bid: 0,
        ask: 0,
        high24h: 0,
        low24h: 0,
        timestamp: expect.any(String)
      });
    });

    it('should throw error on fetch failure', async () => {
      mockExchange.fetchTicker.mockRejectedValue(new Error('Network error'));

      await expect(dataSource.getTicker('BTC/USDT'))
        .rejects.toThrow('Failed to fetch ticker for BTC/USDT from binance: Error: Network error');
    });
  });

  describe('getOrderBook', () => {
    it('should fetch order book data successfully', async () => {
      const mockOrderBookData = {
        symbol: 'BTC/USDT',
        bids: [[49950, 1.5], [49900, 2.0]],
        asks: [[50050, 1.2], [50100, 1.8]],
        timestamp: Date.now()
      };

      mockExchange.fetchOrderBook.mockResolvedValue(mockOrderBookData);

      const result = await dataSource.getOrderBook('BTC/USDT', 100);

      expect(result).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        bids: [[49950, 1.5], [49900, 2.0]],
        asks: [[50050, 1.2], [50100, 1.8]],
        timestamp: expect.any(String)
      });

      expect(mockExchange.loadMarkets).toHaveBeenCalled();
      expect(mockExchange.fetchOrderBook).toHaveBeenCalledWith('BTC/USDT', 100);
    });

    it('should handle missing order book data gracefully', async () => {
      const mockOrderBookData = {
        symbol: 'BTC/USDT',
        bids: [[undefined, undefined]],
        asks: [[undefined, undefined]],
        timestamp: undefined
      };

      mockExchange.fetchOrderBook.mockResolvedValue(mockOrderBookData);

      const result = await dataSource.getOrderBook('BTC/USDT');

      expect(result).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        bids: [[0, 0]],
        asks: [[0, 0]],
        timestamp: expect.any(String)
      });
    });

    it('should throw error on fetch failure', async () => {
      mockExchange.fetchOrderBook.mockRejectedValue(new Error('API error'));

      await expect(dataSource.getOrderBook('BTC/USDT'))
        .rejects.toThrow('Failed to fetch order book for BTC/USDT from binance: Error: API error');
    });
  });

  describe('getTrades', () => {
    it('should fetch trades data successfully', async () => {
      const mockTradesData = [
        {
          id: 'trade1',
          symbol: 'BTC/USDT',
          price: 50000,
          amount: 0.1,
          side: 'buy',
          timestamp: Date.now()
        },
        {
          id: 'trade2',
          symbol: 'BTC/USDT',
          price: 49950,
          amount: 0.2,
          side: 'sell',
          timestamp: Date.now()
        }
      ];

      mockExchange.fetchTrades.mockResolvedValue(mockTradesData);

      const result = await dataSource.getTrades('BTC/USDT', 1000);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'trade1',
        symbol: 'BTC/USDT',
        exchange: 'binance',
        price: 50000,
        quantity: 0.1,
        side: 'buy',
        timestamp: expect.any(String)
      });

      expect(mockExchange.loadMarkets).toHaveBeenCalled();
      expect(mockExchange.fetchTrades).toHaveBeenCalledWith('BTC/USDT', undefined, 1000);
    });

    it('should handle missing trade data gracefully', async () => {
      const mockTradesData = [
        {
          id: undefined,
          symbol: undefined,
          price: undefined,
          amount: undefined,
          side: 'buy',
          timestamp: undefined
        }
      ];

      mockExchange.fetchTrades.mockResolvedValue(mockTradesData);

      const result = await dataSource.getTrades('BTC/USDT');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'BTC/USDT-0',
        symbol: 'BTC/USDT',
        exchange: 'binance',
        price: 0,
        quantity: 0,
        side: 'buy',
        timestamp: expect.any(String)
      });
    });

    it('should throw error on fetch failure', async () => {
      mockExchange.fetchTrades.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(dataSource.getTrades('BTC/USDT'))
        .rejects.toThrow('Failed to fetch trades for BTC/USDT from binance: Error: Rate limit exceeded');
    });
  });

  describe('getCandles', () => {
    it('should fetch OHLCV data successfully', async () => {
      const mockOHLCVData = [
        [Date.now(), 49000, 51000, 48000, 50000, 1000],
        [Date.now() + 60000, 50000, 52000, 49500, 51500, 1200]
      ];

      mockExchange.fetchOHLCV.mockResolvedValue(mockOHLCVData);

      const result = await dataSource.getCandles('BTC/USDT', '1m', 100);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        interval: '1m',
        timestamp: expect.any(String),
        open: 49000,
        high: 51000,
        low: 48000,
        close: 50000,
        volume: 1000,
        trades: 0
      });

      expect(mockExchange.loadMarkets).toHaveBeenCalled();
      expect(mockExchange.fetchOHLCV).toHaveBeenCalledWith('BTC/USDT', '1m', undefined, 100);
    });

    it('should handle missing OHLCV data gracefully', async () => {
      const mockOHLCVData = [
        [undefined, undefined, undefined, undefined, undefined, undefined]
      ];

      mockExchange.fetchOHLCV.mockResolvedValue(mockOHLCVData);

      const result = await dataSource.getCandles('BTC/USDT', '1m');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        interval: '1m',
        timestamp: expect.any(String),
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        trades: 0
      });
    });

    it('should throw error on fetch failure', async () => {
      mockExchange.fetchOHLCV.mockRejectedValue(new Error('Invalid timeframe'));

      await expect(dataSource.getCandles('BTC/USDT', '1m'))
        .rejects.toThrow('Failed to fetch candles for BTC/USDT from binance: Error: Invalid timeframe');
    });
  });

  describe('getSymbols', () => {
    it('should fetch available symbols successfully', async () => {
      // Mock the markets property on the exchange
      mockExchange.markets = {
        'BTC/USDT': { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', active: true }
      };
      
      const result = await dataSource.getSymbols();
      
      expect(result).toEqual(['BTC/USDT']);
      expect(mockExchange.loadMarkets).toHaveBeenCalled();
    });

    it('should throw error on fetch failure', async () => {
      mockExchange.loadMarkets.mockRejectedValue(new Error('Exchange unavailable'));

      await expect(dataSource.getSymbols())
        .rejects.toThrow('Failed to fetch symbols from binance: Error: Exchange unavailable');
    });
  });

  describe('error handling', () => {
    it('should handle exchange initialization errors', () => {
      expect(() => {
        new CCXTDataSource('invalid-exchange' as any);
      }).toThrow();
    });

    it('should handle network timeouts gracefully', async () => {
      mockExchange.fetchTicker.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(dataSource.getTicker('BTC/USDT'))
        .rejects.toThrow('Failed to fetch ticker for BTC/USDT from binance: Error: ETIMEDOUT');
    });

    it('should handle API rate limits gracefully', async () => {
      mockExchange.fetchOrderBook.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(dataSource.getOrderBook('BTC/USDT'))
        .rejects.toThrow('Failed to fetch order book for BTC/USDT from binance: Error: Rate limit exceeded');
    });
  });
});