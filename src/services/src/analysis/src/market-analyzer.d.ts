import type { Env } from '@celebrum-ai/shared';
export declare class MarketAnalyzer {
    private env;
    constructor(env: Env);
    analyzeMarketTrends(symbol: string): Promise<unknown>;
    getMarketSentiment(symbol: string): Promise<unknown>;
}
//# sourceMappingURL=market-analyzer.d.ts.map