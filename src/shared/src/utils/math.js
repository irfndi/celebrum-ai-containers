"use strict";
// Mathematical utility functions for trading and analysis
Object.defineProperty(exports, "__esModule", { value: true });
exports.percentageChange = percentageChange;
exports.calculateCAGR = calculateCAGR;
exports.simpleMovingAverage = simpleMovingAverage;
exports.exponentialMovingAverage = exponentialMovingAverage;
exports.calculateRSI = calculateRSI;
exports.calculateBollingerBands = calculateBollingerBands;
exports.calculateMACD = calculateMACD;
exports.standardDeviation = standardDeviation;
exports.calculateSharpeRatio = calculateSharpeRatio;
exports.calculateMaxDrawdown = calculateMaxDrawdown;
exports.calculateVaR = calculateVaR;
exports.calculateCorrelation = calculateCorrelation;
exports.kellyPositionSize = kellyPositionSize;
exports.roundToDecimals = roundToDecimals;
exports.clamp = clamp;
exports.lerp = lerp;
exports.compoundInterest = compoundInterest;
exports.annualizedVolatility = annualizedVolatility;
/**
 * Calculate percentage change between two values
 */
function percentageChange(oldValue, newValue) {
    if (oldValue === 0)
        return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}
/**
 * Calculate compound annual growth rate (CAGR)
 */
function calculateCAGR(initialValue, finalValue, years) {
    if (initialValue <= 0 || finalValue <= 0 || years <= 0)
        return 0;
    return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}
/**
 * Calculate simple moving average
 */
function simpleMovingAverage(values, period) {
    if (values.length < period)
        return [];
    const result = [];
    for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
    }
    return result;
}
/**
 * Calculate exponential moving average
 */
function exponentialMovingAverage(values, period) {
    if (values.length === 0)
        return [];
    const multiplier = 2 / (period + 1);
    const result = [values[0]];
    for (let i = 1; i < values.length; i++) {
        const ema = (values[i] * multiplier) + (result[i - 1] * (1 - multiplier));
        result.push(ema);
    }
    return result;
}
/**
 * Calculate Relative Strength Index (RSI)
 */
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1)
        return [];
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
    const avgGains = simpleMovingAverage(gains, period);
    const avgLosses = simpleMovingAverage(losses, period);
    const rsi = [];
    for (let i = 0; i < avgGains.length; i++) {
        if (avgLosses[i] === 0) {
            rsi.push(100);
        }
        else {
            const rs = avgGains[i] / avgLosses[i];
            rsi.push(100 - (100 / (1 + rs)));
        }
    }
    return rsi;
}
/**
 * Calculate Bollinger Bands
 */
function calculateBollingerBands(prices, period = 20, standardDeviations = 2) {
    const sma = simpleMovingAverage(prices, period);
    const upper = [];
    const lower = [];
    for (let i = 0; i < sma.length; i++) {
        const slice = prices.slice(i, i + period);
        const mean = sma[i];
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        upper.push(mean + (standardDeviations * stdDev));
        lower.push(mean - (standardDeviations * stdDev));
    }
    return {
        upper,
        middle: sma,
        lower
    };
}
/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = exponentialMovingAverage(prices, fastPeriod);
    const slowEMA = exponentialMovingAverage(prices, slowPeriod);
    const macd = [];
    const startIndex = slowPeriod - fastPeriod;
    for (let i = startIndex; i < fastEMA.length; i++) {
        macd.push(fastEMA[i] - slowEMA[i - startIndex]);
    }
    const signal = exponentialMovingAverage(macd, signalPeriod);
    const histogram = [];
    for (let i = 0; i < signal.length; i++) {
        histogram.push(macd[i + signalPeriod - 1] - signal[i]);
    }
    return { macd, signal, histogram };
}
/**
 * Calculate standard deviation
 */
function standardDeviation(values) {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}
/**
 * Calculate Sharpe ratio
 */
function calculateSharpeRatio(returns, riskFreeRate = 0) {
    if (returns.length === 0)
        return 0;
    const excessReturns = returns.map(r => r - riskFreeRate);
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const stdDev = standardDeviation(excessReturns);
    return stdDev === 0 ? 0 : meanExcessReturn / stdDev;
}
/**
 * Calculate maximum drawdown
 */
function calculateMaxDrawdown(values) {
    if (values.length === 0)
        return { maxDrawdown: 0, peak: 0, trough: 0 };
    let peak = values[0];
    let maxDrawdown = 0;
    let peakValue = values[0];
    let troughValue = values[0];
    for (const value of values) {
        if (value > peak) {
            peak = value;
        }
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
            peakValue = peak;
            troughValue = value;
        }
    }
    return {
        maxDrawdown: maxDrawdown * 100, // Return as percentage
        peak: peakValue,
        trough: troughValue
    };
}
/**
 * Calculate Value at Risk (VaR)
 */
function calculateVaR(returns, confidenceLevel = 0.95) {
    if (returns.length === 0)
        return 0;
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0);
}
/**
 * Calculate correlation coefficient between two arrays
 */
function calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0)
        return 0;
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - meanX;
        const yDiff = y[i] - meanY;
        numerator += xDiff * yDiff;
        sumXSquared += xDiff * xDiff;
        sumYSquared += yDiff * yDiff;
    }
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
}
/**
 * Calculate position size based on Kelly Criterion
 */
function kellyPositionSize(winProbability, averageWin, averageLoss) {
    if (averageLoss === 0)
        return 0;
    const winLossRatio = averageWin / Math.abs(averageLoss);
    const kelly = (winProbability * winLossRatio - (1 - winProbability)) / winLossRatio;
    // Cap at 25% for risk management
    return Math.max(0, Math.min(kelly, 0.25));
}
/**
 * Round to specified decimal places
 */
function roundToDecimals(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
/**
 * Linear interpolation between two values
 */
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}
/**
 * Calculate compound interest
 */
function compoundInterest(principal, rate, time, compoundingFrequency = 1) {
    return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time);
}
/**
 * Calculate annualized volatility from daily returns
 */
function annualizedVolatility(dailyReturns) {
    const dailyVol = standardDeviation(dailyReturns);
    return dailyVol * Math.sqrt(252); // 252 trading days in a year
}
//# sourceMappingURL=math.js.map