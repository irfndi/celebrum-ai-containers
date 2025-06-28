"use strict";
// Technical indicators for trading analysis
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnicalIndicators = void 0;
class TechnicalIndicators {
    static calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }
    static calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        // First EMA is SMA
        const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        ema.push(firstSMA);
        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
            ema.push(currentEMA);
        }
        return ema;
    }
    static calculateRSI(prices, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];
        // Calculate price changes
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        // Calculate RSI
        for (let i = period - 1; i < gains.length; i++) {
            const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
            if (avgLoss === 0) {
                rsi.push(100);
            }
            else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }
        return rsi;
    }
}
exports.TechnicalIndicators = TechnicalIndicators;
//# sourceMappingURL=technical-indicators.js.map