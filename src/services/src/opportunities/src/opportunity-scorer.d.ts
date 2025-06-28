import type { ArbitrageOpportunity } from './arbitrage-detector';
export interface ScoredOpportunity extends ArbitrageOpportunity {
    score: number;
    rank: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: 'execute' | 'monitor' | 'skip';
}
export interface ScoringWeights {
    spreadWeight: number;
    volumeWeight: number;
    confidenceWeight: number;
    timeWeight: number;
    riskWeight: number;
}
export declare class OpportunityScorer {
    private weights;
    private defaultWeights;
    constructor(weights?: Partial<ScoringWeights>);
    scoreOpportunities(opportunities: ArbitrageOpportunity[]): ScoredOpportunity[];
    private scoreOpportunity;
    private calculateSpreadScore;
    private calculateVolumeScore;
    private calculateTimeScore;
    private calculateRiskScore;
    private getExchangeRiskScore;
    private getLiquidityRiskScore;
    private getSpreadRiskScore;
    private determineRiskLevel;
    private makeRecommendation;
    updateWeights(newWeights: Partial<ScoringWeights>): void;
}
//# sourceMappingURL=opportunity-scorer.d.ts.map