"use strict";
// Opportunity scoring and ranking system
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityScorer = void 0;
class OpportunityScorer {
    weights;
    defaultWeights = {
        spreadWeight: 0.3,
        volumeWeight: 0.25,
        confidenceWeight: 0.2,
        timeWeight: 0.15,
        riskWeight: 0.1
    };
    constructor(weights = {}) {
        this.weights = { ...this.defaultWeights, ...weights };
    }
    scoreOpportunities(opportunities) {
        const scoredOpportunities = opportunities.map(opp => this.scoreOpportunity(opp));
        // Sort by score (highest first)
        scoredOpportunities.sort((a, b) => b.score - a.score);
        // Assign ranks
        scoredOpportunities.forEach((opp, index) => {
            opp.rank = index + 1;
        });
        return scoredOpportunities;
    }
    scoreOpportunity(opportunity) {
        const spreadScore = this.calculateSpreadScore(opportunity.spreadPercentage);
        const volumeScore = this.calculateVolumeScore(opportunity.volume);
        const confidenceScore = opportunity.confidence;
        const timeScore = this.calculateTimeScore(opportunity.timestamp);
        const riskScore = this.calculateRiskScore(opportunity);
        const totalScore = (spreadScore * this.weights.spreadWeight +
            volumeScore * this.weights.volumeWeight +
            confidenceScore * this.weights.confidenceWeight +
            timeScore * this.weights.timeWeight +
            riskScore * this.weights.riskWeight);
        const riskLevel = this.determineRiskLevel(opportunity);
        const recommendation = this.makeRecommendation(totalScore, riskLevel);
        return {
            ...opportunity,
            score: Math.round(totalScore * 100) / 100,
            rank: 0, // Will be set after sorting
            riskLevel,
            recommendation
        };
    }
    calculateSpreadScore(spreadPercentage) {
        // Normalize spread percentage to 0-1 scale
        // Higher spread = higher score, but with diminishing returns
        return Math.min(spreadPercentage / 10, 1);
    }
    calculateVolumeScore(volume) {
        // Normalize volume to 0-1 scale
        // Higher volume = higher score, logarithmic scale
        if (volume <= 0)
            return 0;
        return Math.min(Math.log10(volume) / 6, 1); // Max score at 1M volume
    }
    calculateTimeScore(timestamp) {
        // Fresher opportunities get higher scores
        const age = Date.now() - new Date(timestamp).getTime();
        const maxAge = 60000; // 1 minute
        return Math.max(0, 1 - (age / maxAge));
    }
    calculateRiskScore(opportunity) {
        // Lower risk = higher score
        const exchangeRisk = this.getExchangeRiskScore(opportunity.buyExchange, opportunity.sellExchange);
        const liquidityRisk = this.getLiquidityRiskScore(opportunity.volume);
        const spreadRisk = this.getSpreadRiskScore(opportunity.spreadPercentage);
        return 1 - ((exchangeRisk + liquidityRisk + spreadRisk) / 3);
    }
    getExchangeRiskScore(buyExchange, sellExchange) {
        // Risk scores for different exchanges (0 = low risk, 1 = high risk)
        const exchangeRisks = {
            'binance': 0.1,
            'coinbase': 0.1,
            'kraken': 0.2,
            'bitfinex': 0.3,
            'unknown': 0.8
        };
        const buyRisk = exchangeRisks[buyExchange.toLowerCase()] || exchangeRisks.unknown;
        const sellRisk = exchangeRisks[sellExchange.toLowerCase()] || exchangeRisks.unknown;
        return (buyRisk + sellRisk) / 2;
    }
    getLiquidityRiskScore(volume) {
        // Lower volume = higher risk
        if (volume >= 10000)
            return 0.1; // Low risk
        if (volume >= 1000)
            return 0.3; // Medium risk
        if (volume >= 100)
            return 0.6; // High risk
        return 0.9; // Very high risk
    }
    getSpreadRiskScore(spreadPercentage) {
        // Very high spreads might indicate illiquid markets or stale data
        if (spreadPercentage > 10)
            return 0.8; // High risk
        if (spreadPercentage > 5)
            return 0.4; // Medium risk
        return 0.1; // Low risk
    }
    determineRiskLevel(opportunity) {
        const riskScore = 1 - this.calculateRiskScore(opportunity);
        if (riskScore < 0.3)
            return 'low';
        if (riskScore < 0.6)
            return 'medium';
        return 'high';
    }
    makeRecommendation(score, riskLevel) {
        if (riskLevel === 'high')
            return 'skip';
        if (score >= 0.7 && riskLevel === 'low')
            return 'execute';
        if (score >= 0.5)
            return 'monitor';
        return 'skip';
    }
    updateWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
        // Ensure weights sum to 1
        const totalWeight = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalWeight - 1) > 0.01) {
            console.warn('Scoring weights do not sum to 1. Consider normalizing.');
        }
    }
}
exports.OpportunityScorer = OpportunityScorer;
//# sourceMappingURL=opportunity-scorer.js.map