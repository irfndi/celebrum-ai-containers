import type { Env } from '@celebrum-ai/shared';
export interface RiskMetrics {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    valueAtRisk: number;
    riskScore: number;
}
export declare class RiskAssessment {
    private env;
    constructor(env: Env);
    calculateRiskMetrics(prices: number[]): Promise<RiskMetrics>;
    private calculateReturns;
    private calculateVolatility;
    private calculateSharpeRatio;
    private calculateMaxDrawdown;
    private calculateVaR;
    private calculateRiskScore;
}
//# sourceMappingURL=risk-assessment.d.ts.map