// Risk assessment functionality

import type { Env } from '@celebrum-ai/shared';

export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  riskScore: number;
}

export class RiskAssessment {
  constructor(private env: Env) {}

  async calculateRiskMetrics(prices: number[]): Promise<RiskMetrics> {
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

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private calculateSharpeRatio(returns: number[], volatility: number, riskFreeRate: number = 0.02): number {
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const annualizedReturn = meanReturn * 252;
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  private calculateMaxDrawdown(prices: number[]): number {
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

  private calculateVaR(returns: number[], confidence: number = 0.05): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor(confidence * sortedReturns.length);
    return Math.abs(sortedReturns[index]);
  }

  private calculateRiskScore(volatility: number, sharpeRatio: number, maxDrawdown: number): number {
    // Simple risk scoring algorithm (0-100, higher = riskier)
    const volScore = Math.min(volatility * 100, 50);
    const sharpeScore = Math.max(0, 25 - (sharpeRatio * 10));
    const drawdownScore = maxDrawdown * 25;
    
    return Math.min(100, volScore + sharpeScore + drawdownScore);
  }
}