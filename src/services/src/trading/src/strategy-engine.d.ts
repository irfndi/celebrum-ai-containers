import type { Env } from '@celebrum-ai/shared';
export interface TradingStrategy {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    enabled: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    expectedReturn: number;
    maxDrawdown: number;
}
export interface TradingSignal {
    strategyId: string;
    symbol: string;
    action: 'buy' | 'sell' | 'hold';
    strength: number;
    price: number;
    volume: number;
    timestamp: string;
    reasoning: string;
}
export interface StrategyPerformance {
    strategyId: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    averageReturn: number;
    lastUpdated: string;
}
export declare class StrategyEngine {
    private env;
    private strategies;
    private activeSignals;
    constructor(env: Env);
    private initializeDefaultStrategies;
    addStrategy(strategy: TradingStrategy): void;
    removeStrategy(strategyId: string): boolean;
    getStrategy(strategyId: string): TradingStrategy | undefined;
    getAllStrategies(): TradingStrategy[];
    getEnabledStrategies(): TradingStrategy[];
    generateSignals(marketData: unknown): Promise<TradingSignal[]>;
    private executeStrategy;
    private executeMeanReversionStrategy;
    private executeMomentumStrategy;
    private executeArbitrageStrategy;
    private addSignal;
    getSignals(symbol?: string): TradingSignal[];
    getStrategyPerformance(strategyId: string): Promise<StrategyPerformance | null>;
    enableStrategy(strategyId: string): boolean;
    disableStrategy(strategyId: string): boolean;
    updateStrategyParameters(strategyId: string, parameters: Record<string, unknown>): boolean;
}
//# sourceMappingURL=strategy-engine.d.ts.map