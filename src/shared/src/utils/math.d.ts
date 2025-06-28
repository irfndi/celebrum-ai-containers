/**
 * Calculate percentage change between two values
 */
export declare function percentageChange(oldValue: number, newValue: number): number;
/**
 * Calculate compound annual growth rate (CAGR)
 */
export declare function calculateCAGR(initialValue: number, finalValue: number, years: number): number;
/**
 * Calculate simple moving average
 */
export declare function simpleMovingAverage(values: number[], period: number): number[];
/**
 * Calculate exponential moving average
 */
export declare function exponentialMovingAverage(values: number[], period: number): number[];
/**
 * Calculate Relative Strength Index (RSI)
 */
export declare function calculateRSI(prices: number[], period?: number): number[];
/**
 * Calculate Bollinger Bands
 */
export declare function calculateBollingerBands(prices: number[], period?: number, standardDeviations?: number): {
    upper: number[];
    middle: number[];
    lower: number[];
};
/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export declare function calculateMACD(prices: number[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): {
    macd: number[];
    signal: number[];
    histogram: number[];
};
/**
 * Calculate standard deviation
 */
export declare function standardDeviation(values: number[]): number;
/**
 * Calculate Sharpe ratio
 */
export declare function calculateSharpeRatio(returns: number[], riskFreeRate?: number): number;
/**
 * Calculate maximum drawdown
 */
export declare function calculateMaxDrawdown(values: number[]): {
    maxDrawdown: number;
    peak: number;
    trough: number;
};
/**
 * Calculate Value at Risk (VaR)
 */
export declare function calculateVaR(returns: number[], confidenceLevel?: number): number;
/**
 * Calculate correlation coefficient between two arrays
 */
export declare function calculateCorrelation(x: number[], y: number[]): number;
/**
 * Calculate position size based on Kelly Criterion
 */
export declare function kellyPositionSize(winProbability: number, averageWin: number, averageLoss: number): number;
/**
 * Round to specified decimal places
 */
export declare function roundToDecimals(value: number, decimals: number): number;
/**
 * Clamp value between min and max
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Linear interpolation between two values
 */
export declare function lerp(start: number, end: number, factor: number): number;
/**
 * Calculate compound interest
 */
export declare function compoundInterest(principal: number, rate: number, time: number, compoundingFrequency?: number): number;
/**
 * Calculate annualized volatility from daily returns
 */
export declare function annualizedVolatility(dailyReturns: number[]): number;
//# sourceMappingURL=math.d.ts.map