"use strict";
// Risk assessment functionality
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessment = void 0;
class RiskAssessment {
    env;
    constructor(env) {
        this.env = env;
    }
    async calculateRiskMetrics(prices) {
        const returns = this.calculateReturns(prices);
        const volatility = this.calculateVolatility(returns);
        const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
        const maxDrawdown = this.calculateMaxDrawdown(prices);
        const valueAtRisk = this.calculateVaR(returns);
        return {
            volatility,
            sharpeRatio,
            maxDrawdown,
            valueAtRisk,
            riskScore: this.calculateRiskScore(volatility, sharpeRatio, maxDrawdown)
        };
    }
    calculateReturns(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        return returns;
    }
    calculateVolatility(returns) {
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized volatility
    }
    calculateSharpeRatio(returns, volatility, riskFreeRate = 0.02) {
        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const annualizedReturn = meanReturn * 252;
        return (annualizedReturn - riskFreeRate) / volatility;
    }
    calculateMaxDrawdown(prices) {
        let maxDrawdown = 0;
        let peak = prices[0];
        for (const price of prices) {
            if (price > peak) {
                peak = price;
            }
            const drawdown = (peak - price) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        return maxDrawdown;
    }
    calculateVaR(returns, confidence = 0.05) {
        const sortedReturns = returns.sort((a, b) => a - b);
        const index = Math.floor(confidence * sortedReturns.length);
        return Math.abs(sortedReturns[index]);
    }
    calculateRiskScore(volatility, sharpeRatio, maxDrawdown) {
        // Simple risk scoring algorithm (0-100, higher = riskier)
        const volScore = Math.min(volatility * 100, 50);
        const sharpeScore = Math.max(0, 25 - (sharpeRatio * 10));
        const drawdownScore = maxDrawdown * 25;
        return Math.min(100, volScore + sharpeScore + drawdownScore);
    }
}
exports.RiskAssessment = RiskAssessment;
//# sourceMappingURL=risk-assessment.js.map