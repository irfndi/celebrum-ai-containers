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
export declare class ArbitrageDetector {
    private env;
    private minSpreadPercentage;
    private maxOpportunityAge;
    constructor(env: Env);
    detectOpportunities(prices: ExchangePrice[]): Promise<ArbitrageOpportunity[]>;
    private groupPricesBySymbol;
    private findArbitrageForSymbol;
    private generateOpportunityId;
    private calculateEstimatedProfit;
    private calculateConfidence;
    setMinSpreadPercentage(percentage: number): void;
    setMaxOpportunityAge(milliseconds: number): void;
}
//# sourceMappingURL=arbitrage-detector.d.ts.map