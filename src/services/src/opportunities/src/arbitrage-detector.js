"use strict";
// Arbitrage opportunity detection
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbitrageDetector = void 0;
class ArbitrageDetector {
    env;
    minSpreadPercentage = 0.5; // Minimum 0.5% spread
    maxOpportunityAge = 30000; // 30 seconds
    constructor(env) {
        this.env = env;
    }
    async detectOpportunities(prices) {
        const opportunities = [];
        const pricesBySymbol = this.groupPricesBySymbol(prices);
        for (const [symbol, symbolPrices] of pricesBySymbol.entries()) {
            const symbolOpportunities = this.findArbitrageForSymbol(symbol, symbolPrices);
            opportunities.push(...symbolOpportunities);
        }
        return opportunities.filter(opp => opp.spreadPercentage >= this.minSpreadPercentage);
    }
    groupPricesBySymbol(prices) {
        const grouped = new Map();
        for (const price of prices) {
            if (!grouped.has(price.symbol)) {
                grouped.set(price.symbol, []);
            }
            grouped.get(price.symbol).push(price);
        }
        return grouped;
    }
    findArbitrageForSymbol(symbol, prices) {
        const opportunities = [];
        // Filter out stale prices
        const freshPrices = prices.filter(p => Date.now() - new Date(p.timestamp).getTime() < this.maxOpportunityAge);
        if (freshPrices.length < 2)
            return opportunities;
        // Find all possible arbitrage pairs
        for (let i = 0; i < freshPrices.length; i++) {
            for (let j = i + 1; j < freshPrices.length; j++) {
                const price1 = freshPrices[i];
                const price2 = freshPrices[j];
                // Determine buy and sell exchanges
                const [buyPrice, sellPrice] = price1.price < price2.price
                    ? [price1, price2]
                    : [price2, price1];
                const spread = sellPrice.price - buyPrice.price;
                const spreadPercentage = (spread / buyPrice.price) * 100;
                if (spreadPercentage >= this.minSpreadPercentage) {
                    const opportunity = {
                        id: this.generateOpportunityId(symbol, buyPrice.exchange, sellPrice.exchange),
                        symbol,
                        buyExchange: buyPrice.exchange,
                        sellExchange: sellPrice.exchange,
                        buyPrice: buyPrice.price,
                        sellPrice: sellPrice.price,
                        spread,
                        spreadPercentage,
                        volume: Math.min(buyPrice.volume, sellPrice.volume),
                        estimatedProfit: this.calculateEstimatedProfit(spread, Math.min(buyPrice.volume, sellPrice.volume)),
                        confidence: this.calculateConfidence(spreadPercentage, Math.min(buyPrice.volume, sellPrice.volume)),
                        timestamp: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + this.maxOpportunityAge).toISOString()
                    };
                    opportunities.push(opportunity);
                }
            }
        }
        return opportunities;
    }
    generateOpportunityId(symbol, buyExchange, sellExchange) {
        const timestamp = Date.now();
        return `${symbol}_${buyExchange}_${sellExchange}_${timestamp}`;
    }
    calculateEstimatedProfit(spread, volume) {
        // Simple profit calculation (spread * volume - fees)
        const tradingFees = 0.002; // 0.2% total fees (buy + sell)
        const grossProfit = spread * volume;
        const fees = volume * tradingFees;
        return Math.max(0, grossProfit - fees);
    }
    calculateConfidence(spreadPercentage, volume) {
        // Confidence based on spread size and volume
        const spreadScore = Math.min(spreadPercentage / 5, 1); // Max at 5% spread
        const volumeScore = Math.min(volume / 10000, 1); // Max at 10k volume
        return (spreadScore + volumeScore) / 2;
    }
    setMinSpreadPercentage(percentage) {
        this.minSpreadPercentage = percentage;
    }
    setMaxOpportunityAge(milliseconds) {
        this.maxOpportunityAge = milliseconds;
    }
}
exports.ArbitrageDetector = ArbitrageDetector;
//# sourceMappingURL=arbitrage-detector.js.map