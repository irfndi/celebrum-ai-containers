"use strict";
// Risk management and position sizing
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
class RiskManager {
    env;
    riskAlerts = new Map();
    defaultRiskLimits = {
        maxPositionSize: 0.1, // 10%
        maxDailyLoss: 0.02, // 2%
        maxDrawdown: 0.15, // 15%
        maxLeverage: 3.0,
        maxCorrelation: 0.7
    };
    constructor(env) {
        this.env = env;
    }
    async assessPortfolioRisk(portfolio) {
        const portfolioRisk = this.calculatePortfolioRisk(portfolio);
        const positionRisk = this.calculatePositionRisk(portfolio);
        const correlationRisk = await this.calculateCorrelationRisk(portfolio);
        const leverageRisk = this.calculateLeverageRisk(portfolio);
        const concentrationRisk = this.calculateConcentrationRisk(portfolio);
        const overallRiskScore = this.calculateOverallRiskScore({
            portfolioRisk,
            positionRisk,
            correlationRisk,
            leverageRisk,
            concentrationRisk
        });
        return {
            portfolioRisk,
            positionRisk,
            correlationRisk,
            leverageRisk,
            concentrationRisk,
            overallRiskScore
        };
    }
    async recommendPositionSize(portfolio, symbol, entryPrice, stopLossPrice, riskPercentage = 0.01 // 1% risk per trade
    ) {
        const riskAmount = portfolio.totalValue * riskPercentage;
        const priceRisk = Math.abs(entryPrice - stopLossPrice);
        if (priceRisk === 0) {
            return {
                recommendedSize: 0,
                maxSize: 0,
                riskScore: 10,
                reasoning: ['Invalid stop loss price - no price risk defined']
            };
        }
        const baseSize = riskAmount / priceRisk;
        const maxSizeByPortfolio = (portfolio.totalValue * this.defaultRiskLimits.maxPositionSize) / entryPrice;
        const maxSizeByBalance = portfolio.availableBalance / entryPrice;
        const maxSize = Math.min(maxSizeByPortfolio, maxSizeByBalance);
        const recommendedSize = Math.min(baseSize, maxSize);
        const reasoning = [];
        let riskScore = 1;
        if (baseSize > maxSizeByPortfolio) {
            reasoning.push('Position size limited by portfolio concentration limits');
            riskScore += 2;
        }
        if (baseSize > maxSizeByBalance) {
            reasoning.push('Position size limited by available balance');
            riskScore += 1;
        }
        // Check for existing exposure to the same symbol
        const existingPositions = portfolio.positions.filter(p => p.symbol === symbol);
        if (existingPositions.length > 0) {
            reasoning.push('Existing positions in same symbol detected');
            riskScore += 1;
        }
        return {
            recommendedSize,
            maxSize,
            riskScore: Math.min(riskScore, 10),
            reasoning
        };
    }
    async recommendStopLoss(symbol, entryPrice, side, method = 'percentage', riskPercentage = 0.02 // 2% risk
    ) {
        let stopLossPrice;
        let actualRiskPercentage;
        switch (method) {
            case 'percentage':
                if (side === 'long') {
                    stopLossPrice = entryPrice * (1 - riskPercentage);
                }
                else {
                    stopLossPrice = entryPrice * (1 + riskPercentage);
                }
                actualRiskPercentage = riskPercentage;
                break;
            case 'atr':
                // TODO: Implement ATR-based stop loss
                // This would require historical price data to calculate ATR
                const atrMultiplier = 2.0;
                const estimatedATR = entryPrice * 0.02; // Placeholder
                if (side === 'long') {
                    stopLossPrice = entryPrice - (estimatedATR * atrMultiplier);
                }
                else {
                    stopLossPrice = entryPrice + (estimatedATR * atrMultiplier);
                }
                actualRiskPercentage = Math.abs(stopLossPrice - entryPrice) / entryPrice;
                break;
            case 'support_resistance':
                // TODO: Implement support/resistance based stop loss
                // This would require technical analysis of price levels
                stopLossPrice = side === 'long'
                    ? entryPrice * 0.95 // Placeholder: 5% below entry
                    : entryPrice * 1.05; // Placeholder: 5% above entry
                actualRiskPercentage = 0.05;
                break;
            default:
                throw new Error(`Unknown stop loss method: ${method}`);
        }
        const riskAmount = Math.abs(stopLossPrice - entryPrice);
        return {
            stopLossPrice,
            riskAmount,
            riskPercentage: actualRiskPercentage,
            method
        };
    }
    async checkRiskLimits(portfolio) {
        const alerts = [];
        const metrics = await this.assessPortfolioRisk(portfolio);
        // Check daily loss limit
        if (portfolio.dailyPnL < -portfolio.totalValue * this.defaultRiskLimits.maxDailyLoss) {
            alerts.push({
                id: this.generateAlertId(),
                type: 'critical',
                message: `Daily loss limit exceeded: ${(portfolio.dailyPnL / portfolio.totalValue * 100).toFixed(2)}%`,
                portfolioId: portfolio.id,
                timestamp: new Date().toISOString(),
                acknowledged: false
            });
        }
        // Check overall risk score
        if (metrics.overallRiskScore > 7) {
            alerts.push({
                id: this.generateAlertId(),
                type: 'warning',
                message: `High portfolio risk score: ${metrics.overallRiskScore}/10`,
                portfolioId: portfolio.id,
                timestamp: new Date().toISOString(),
                acknowledged: false
            });
        }
        // Check concentration risk
        if (metrics.concentrationRisk > 0.8) {
            alerts.push({
                id: this.generateAlertId(),
                type: 'warning',
                message: 'High concentration risk detected',
                portfolioId: portfolio.id,
                timestamp: new Date().toISOString(),
                acknowledged: false
            });
        }
        // Store alerts
        const existingAlerts = this.riskAlerts.get(portfolio.id) || [];
        this.riskAlerts.set(portfolio.id, [...existingAlerts, ...alerts]);
        return alerts;
    }
    calculatePortfolioRisk(portfolio) {
        if (portfolio.positions.length === 0)
            return 0;
        const totalValue = portfolio.totalValue;
        const totalUnrealizedPnL = portfolio.positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
        // Risk as percentage of total portfolio value
        return Math.abs(totalUnrealizedPnL) / totalValue;
    }
    calculatePositionRisk(portfolio) {
        if (portfolio.positions.length === 0)
            return 0;
        let maxPositionRisk = 0;
        for (const position of portfolio.positions) {
            const positionValue = position.size * position.currentPrice;
            const positionRisk = positionValue / portfolio.totalValue;
            maxPositionRisk = Math.max(maxPositionRisk, positionRisk);
        }
        return maxPositionRisk;
    }
    async calculateCorrelationRisk(portfolio) {
        // TODO: Implement correlation calculation between positions
        // This would require historical price data and correlation analysis
        // Placeholder: Check for same-symbol positions
        const symbols = new Set(portfolio.positions.map(p => p.symbol));
        const uniqueSymbols = symbols.size;
        const totalPositions = portfolio.positions.length;
        if (totalPositions === 0)
            return 0;
        // Simple correlation risk based on symbol diversity
        return 1 - (uniqueSymbols / totalPositions);
    }
    calculateLeverageRisk(portfolio) {
        const totalPositionValue = portfolio.positions.reduce((sum, pos) => {
            return sum + (pos.size * pos.currentPrice);
        }, 0);
        const leverage = totalPositionValue / portfolio.totalValue;
        const maxLeverage = this.defaultRiskLimits.maxLeverage;
        return Math.min(leverage / maxLeverage, 1);
    }
    calculateConcentrationRisk(portfolio) {
        if (portfolio.positions.length === 0)
            return 0;
        const symbolExposure = new Map();
        for (const position of portfolio.positions) {
            const exposure = position.size * position.currentPrice;
            const current = symbolExposure.get(position.symbol) || 0;
            symbolExposure.set(position.symbol, current + exposure);
        }
        let maxConcentration = 0;
        for (const exposure of symbolExposure.values()) {
            const concentration = exposure / portfolio.totalValue;
            maxConcentration = Math.max(maxConcentration, concentration);
        }
        return maxConcentration;
    }
    calculateOverallRiskScore(metrics) {
        const weights = {
            portfolioRisk: 0.25,
            positionRisk: 0.20,
            correlationRisk: 0.20,
            leverageRisk: 0.20,
            concentrationRisk: 0.15
        };
        const score = (metrics.portfolioRisk * weights.portfolioRisk * 10) +
            (metrics.positionRisk * weights.positionRisk * 10) +
            (metrics.correlationRisk * weights.correlationRisk * 10) +
            (metrics.leverageRisk * weights.leverageRisk * 10) +
            (metrics.concentrationRisk * weights.concentrationRisk * 10);
        return Math.min(Math.max(score, 0), 10);
    }
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async getActiveAlerts(portfolioId) {
        const alerts = this.riskAlerts.get(portfolioId) || [];
        return alerts.filter(alert => !alert.acknowledged);
    }
    async acknowledgeAlert(portfolioId, alertId) {
        const alerts = this.riskAlerts.get(portfolioId) || [];
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }
    updateRiskLimits(newLimits) {
        this.defaultRiskLimits = { ...this.defaultRiskLimits, ...newLimits };
    }
    getRiskLimits() {
        return { ...this.defaultRiskLimits };
    }
}
exports.RiskManager = RiskManager;
//# sourceMappingURL=risk-manager.js.map