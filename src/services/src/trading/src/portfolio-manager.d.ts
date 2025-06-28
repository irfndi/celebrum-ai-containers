import type { Env } from '@celebrum-ai/shared';
export interface Position {
    id: string;
    symbol: string;
    exchange: string;
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    realizedPnL: number;
    openTime: string;
    lastUpdated: string;
    stopLoss?: number;
    takeProfit?: number;
}
export interface Portfolio {
    id: string;
    userId: string;
    totalValue: number;
    availableBalance: number;
    positions: Position[];
    totalPnL: number;
    dailyPnL: number;
    lastUpdated: string;
}
export interface PortfolioMetrics {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
}
export interface RiskLimits {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
    maxLeverage: number;
    maxCorrelation: number;
}
export declare class PortfolioManager {
    private env;
    private portfolios;
    private defaultRiskLimits;
    constructor(env: Env);
    createPortfolio(userId: string, initialBalance: number): Promise<Portfolio>;
    getPortfolio(portfolioId: string): Promise<Portfolio | null>;
    getUserPortfolios(userId: string): Promise<Portfolio[]>;
    openPosition(portfolioId: string, symbol: string, exchange: string, side: 'long' | 'short', size: number, entryPrice: number, stopLoss?: number, takeProfit?: number): Promise<Position | null>;
    closePosition(portfolioId: string, positionId: string, exitPrice: number): Promise<boolean>;
    updatePositionPrices(portfolioId: string, priceUpdates: Record<string, number>): Promise<void>;
    private calculateUnrealizedPnL;
    private calculateRealizedPnL;
    private calculatePortfolioValue;
    private validatePositionRisk;
    calculateMetrics(portfolioId: string): Promise<PortfolioMetrics | null>;
    private generatePortfolioId;
    private generatePositionId;
    private savePortfolio;
    private loadPortfolio;
    getPositionsBySymbol(portfolioId: string, symbol: string): Promise<Position[]>;
    getTotalExposure(portfolioId: string): Promise<number>;
    updateRiskLimits(newLimits: Partial<RiskLimits>): void;
}
//# sourceMappingURL=portfolio-manager.d.ts.map