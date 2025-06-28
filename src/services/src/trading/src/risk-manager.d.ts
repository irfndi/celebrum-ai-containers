import type { Env } from '@celebrum-ai/shared';
import type { Portfolio, RiskLimits } from './portfolio-manager';
export interface RiskMetrics {
    portfolioRisk: number;
    positionRisk: number;
    correlationRisk: number;
    leverageRisk: number;
    concentrationRisk: number;
    overallRiskScore: number;
}
export interface RiskAlert {
    id: string;
    type: 'warning' | 'critical';
    message: string;
    portfolioId: string;
    positionId?: string;
    timestamp: string;
    acknowledged: boolean;
}
export interface PositionSizeRecommendation {
    recommendedSize: number;
    maxSize: number;
    riskScore: number;
    reasoning: string[];
}
export interface StopLossRecommendation {
    stopLossPrice: number;
    riskAmount: number;
    riskPercentage: number;
    method: 'atr' | 'percentage' | 'support_resistance';
}
export declare class RiskManager {
    private env;
    private riskAlerts;
    private defaultRiskLimits;
    constructor(env: Env);
    assessPortfolioRisk(portfolio: Portfolio): Promise<RiskMetrics>;
    recommendPositionSize(portfolio: Portfolio, symbol: string, entryPrice: number, stopLossPrice: number, riskPercentage?: number): Promise<PositionSizeRecommendation>;
    recommendStopLoss(symbol: string, entryPrice: number, side: 'long' | 'short', method?: 'atr' | 'percentage' | 'support_resistance', riskPercentage?: number): Promise<StopLossRecommendation>;
    checkRiskLimits(portfolio: Portfolio): Promise<RiskAlert[]>;
    private calculatePortfolioRisk;
    private calculatePositionRisk;
    private calculateCorrelationRisk;
    private calculateLeverageRisk;
    private calculateConcentrationRisk;
    private calculateOverallRiskScore;
    private generateAlertId;
    getActiveAlerts(portfolioId: string): Promise<RiskAlert[]>;
    acknowledgeAlert(portfolioId: string, alertId: string): Promise<boolean>;
    updateRiskLimits(newLimits: Partial<RiskLimits>): void;
    getRiskLimits(): RiskLimits;
}
//# sourceMappingURL=risk-manager.d.ts.map