// Arbitrage opportunity detection

import type { Env } from '@celebrum-ai/shared';

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercentage: number;
  volume: number;
  estimatedProfit: number;
  confidence: number;
  timestamp: string;
  expiresAt: string;
}

export interface ExchangePrice {
  exchange: string;
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

export class ArbitrageDetector {
  private minSpreadPercentage: number = 0.5; // Minimum 0.5% spread
  private maxOpportunityAge: number = 30000; // 30 seconds

  constructor(private env: Env) {}

  async detectOpportunities(prices: ExchangePrice[]): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const pricesBySymbol = this.groupPricesBySymbol(prices);

    for (const [symbol, symbolPrices] of pricesBySymbol.entries()) {
      const symbolOpportunities = this.findArbitrageForSymbol(symbol, symbolPrices);
      opportunities.push(...symbolOpportunities);
    }

    return opportunities.filter(opp => opp.spreadPercentage >= this.minSpreadPercentage);
  }

  private groupPricesBySymbol(prices: ExchangePrice[]): Map<string, ExchangePrice[]> {
    const grouped = new Map<string, ExchangePrice[]>();
    
    for (const price of prices) {
      if (!grouped.has(price.symbol)) {
        grouped.set(price.symbol, []);
      }
      grouped.get(price.symbol)!.push(price);
    }
    
    return grouped;
  }

  private findArbitrageForSymbol(symbol: string, prices: ExchangePrice[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Filter out stale prices
    const freshPrices = prices.filter(p => 
      Date.now() - new Date(p.timestamp).getTime() < this.maxOpportunityAge
    );

    if (freshPrices.length < 2) return opportunities;

    // Find all possible arbitrage pairs
    for (let i = 0; i < freshPrices.length; i++) {
      for (let j = i + 1; j < freshPrices.length; j++) {
        const price1 = freshPrices[i];
        const price2 = freshPrices[j];
        
        // Determine buy and sell exchanges
        const [buyPrice, sellPrice] = price1.price < price2.price 
          ? [price1, price2] 
          : [price2, price1];
        
        const spread = sellPrice.price - buyPrice.price;
        const spreadPercentage = (spread / buyPrice.price) * 100;
        
        if (spreadPercentage >= this.minSpreadPercentage) {
          const opportunity: ArbitrageOpportunity = {
            id: this.generateOpportunityId(symbol, buyPrice.exchange, sellPrice.exchange),
            symbol,
            buyExchange: buyPrice.exchange,
            sellExchange: sellPrice.exchange,
            buyPrice: buyPrice.price,
            sellPrice: sellPrice.price,
            spread,
            spreadPercentage,
            volume: Math.min(buyPrice.volume, sellPrice.volume),
            estimatedProfit: this.calculateEstimatedProfit(spread, Math.min(buyPrice.volume, sellPrice.volume)),
            confidence: this.calculateConfidence(spreadPercentage, Math.min(buyPrice.volume, sellPrice.volume)),
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.maxOpportunityAge).toISOString()
          };
          
          opportunities.push(opportunity);
        }
      }
    }
    
    return opportunities;
  }

  private generateOpportunityId(symbol: string, buyExchange: string, sellExchange: string): string {
    const timestamp = Date.now();
    return `${symbol}_${buyExchange}_${sellExchange}_${timestamp}`;
  }

  private calculateEstimatedProfit(spread: number, volume: number): number {
    // Simple profit calculation (spread * volume - fees)
    const tradingFees = 0.002; // 0.2% total fees (buy + sell)
    const grossProfit = spread * volume;
    const fees = volume * tradingFees;
    return Math.max(0, grossProfit - fees);
  }

  private calculateConfidence(spreadPercentage: number, volume: number): number {
    // Confidence based on spread size and volume
    const spreadScore = Math.min(spreadPercentage / 5, 1); // Max at 5% spread
    const volumeScore = Math.min(volume / 10000, 1); // Max at 10k volume
    return (spreadScore + volumeScore) / 2;
  }

  setMinSpreadPercentage(percentage: number): void {
    this.minSpreadPercentage = percentage;
  }

  setMaxOpportunityAge(milliseconds: number): void {
    this.maxOpportunityAge = milliseconds;
  }
}