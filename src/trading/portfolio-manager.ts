// Portfolio management and position tracking

import type { Env } from '@celebrum-ai/shared';

export interface Position {
  id: string;
  symbol: string;
  exchange: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openTime: string;
  lastUpdated: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Portfolio {
  id: string;
  userId: string;
  totalValue: number;
  availableBalance: number;
  positions: Position[];
  totalPnL: number;
  dailyPnL: number;
  lastUpdated: string;
}

export interface PortfolioMetrics {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}

export interface RiskLimits {
  maxPositionSize: number; // Maximum position size as % of portfolio
  maxDailyLoss: number; // Maximum daily loss as % of portfolio
  maxDrawdown: number; // Maximum drawdown as % of portfolio
  maxLeverage: number; // Maximum leverage ratio
  maxCorrelation: number; // Maximum correlation between positions
}

export class PortfolioManager {
  private portfolios: Map<string, Portfolio> = new Map();
  private defaultRiskLimits: RiskLimits = {
    maxPositionSize: 0.1, // 10%
    maxDailyLoss: 0.02, // 2%
    maxDrawdown: 0.15, // 15%
    maxLeverage: 3.0,
    maxCorrelation: 0.7
  };

  constructor(private env: Env) {}

  async createPortfolio(userId: string, initialBalance: number): Promise<Portfolio> {
    const portfolioId = this.generatePortfolioId(userId);
    
    const portfolio: Portfolio = {
      id: portfolioId,
      userId,
      totalValue: initialBalance,
      availableBalance: initialBalance,
      positions: [],
      totalPnL: 0,
      dailyPnL: 0,
      lastUpdated: new Date().toISOString()
    };

    this.portfolios.set(portfolioId, portfolio);
    await this.savePortfolio(portfolio);
    
    return portfolio;
  }

  async getPortfolio(portfolioId: string): Promise<Portfolio | null> {
    let portfolio = this.portfolios.get(portfolioId);
    
    if (!portfolio) {
      portfolio = await this.loadPortfolio(portfolioId);
      if (portfolio) {
        this.portfolios.set(portfolioId, portfolio);
      }
    }
    
    return portfolio || null;
  }

  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    // TODO: Implement user portfolio lookup
    const userPortfolios: Portfolio[] = [];
    
    for (const portfolio of this.portfolios.values()) {
      if (portfolio.userId === userId) {
        userPortfolios.push(portfolio);
      }
    }
    
    return userPortfolios;
  }

  async openPosition(
    portfolioId: string,
    symbol: string,
    exchange: string,
    side: 'long' | 'short',
    size: number,
    entryPrice: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<Position | null> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) return null;

    // Risk checks
    const riskCheck = this.validatePositionRisk(portfolio, size, entryPrice);
    if (!riskCheck.valid) {
      throw new Error(`Risk check failed: ${riskCheck.reason}`);
    }

    const position: Position = {
      id: this.generatePositionId(),
      symbol,
      exchange,
      side,
      size,
      entryPrice,
      currentPrice: entryPrice,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      stopLoss,
      takeProfit
    };

    portfolio.positions.push(position);
    portfolio.availableBalance -= size * entryPrice;
    portfolio.lastUpdated = new Date().toISOString();

    await this.savePortfolio(portfolio);
    return position;
  }

  async closePosition(portfolioId: string, positionId: string, exitPrice: number): Promise<boolean> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) return false;

    const positionIndex = portfolio.positions.findIndex(p => p.id === positionId);
    if (positionIndex === -1) return false;

    const position = portfolio.positions[positionIndex];
    const realizedPnL = this.calculateRealizedPnL(position, exitPrice);

    // Update portfolio
    portfolio.positions.splice(positionIndex, 1);
    portfolio.availableBalance += (position.size * exitPrice);
    portfolio.totalPnL += realizedPnL;
    portfolio.lastUpdated = new Date().toISOString();

    await this.savePortfolio(portfolio);
    return true;
  }

  async updatePositionPrices(portfolioId: string, priceUpdates: Record<string, number>): Promise<void> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) return;

    let updated = false;
    
    for (const position of portfolio.positions) {
      const newPrice = priceUpdates[position.symbol];
      if (newPrice && newPrice !== position.currentPrice) {
        position.currentPrice = newPrice;
        position.unrealizedPnL = this.calculateUnrealizedPnL(position);
        position.lastUpdated = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      portfolio.totalValue = this.calculatePortfolioValue(portfolio);
      portfolio.lastUpdated = new Date().toISOString();
      await this.savePortfolio(portfolio);
    }
  }

  private calculateUnrealizedPnL(position: Position): number {
    const priceDiff = position.currentPrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return priceDiff * position.size * multiplier;
  }

  private calculateRealizedPnL(position: Position, exitPrice: number): number {
    const priceDiff = exitPrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return priceDiff * position.size * multiplier;
  }

  private calculatePortfolioValue(portfolio: Portfolio): number {
    let totalValue = portfolio.availableBalance;
    
    for (const position of portfolio.positions) {
      totalValue += position.size * position.currentPrice;
    }
    
    return totalValue;
  }

  private validatePositionRisk(
    portfolio: Portfolio,
    size: number,
    price: number
  ): { valid: boolean; reason?: string } {
    const positionValue = size * price;
    const positionSizePercent = positionValue / portfolio.totalValue;

    if (positionSizePercent > this.defaultRiskLimits.maxPositionSize) {
      return {
        valid: false,
        reason: `Position size (${(positionSizePercent * 100).toFixed(1)}%) exceeds maximum allowed (${(this.defaultRiskLimits.maxPositionSize * 100).toFixed(1)}%)`
      };
    }

    if (positionValue > portfolio.availableBalance) {
      return {
        valid: false,
        reason: 'Insufficient available balance'
      };
    }

    return { valid: true };
  }

  async calculateMetrics(portfolioId: string): Promise<PortfolioMetrics | null> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) return null;

    // TODO: Implement comprehensive metrics calculation
    // This would involve:
    // 1. Historical performance data
    // 2. Risk-adjusted returns
    // 3. Drawdown analysis
    // 4. Win/loss statistics

    return {
      totalReturn: portfolio.totalPnL / (portfolio.totalValue - portfolio.totalPnL),
      sharpeRatio: 0, // TODO: Calculate
      maxDrawdown: 0, // TODO: Calculate
      volatility: 0, // TODO: Calculate
      winRate: 0, // TODO: Calculate
      averageWin: 0, // TODO: Calculate
      averageLoss: 0, // TODO: Calculate
      profitFactor: 0 // TODO: Calculate
    };
  }

  private generatePortfolioId(userId: string): string {
    return `portfolio_${userId}_${Date.now()}`;
  }

  private generatePositionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async savePortfolio(portfolio: Portfolio): Promise<void> {
    try {
      const key = `portfolio:${portfolio.id}`;
      await this.env.CELEBRUM_KV?.put(key, JSON.stringify(portfolio));
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  }

  private async loadPortfolio(portfolioId: string): Promise<Portfolio | null> {
    try {
      const key = `portfolio:${portfolioId}`;
      const data = await this.env.CELEBRUM_KV?.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading portfolio:', error);
      return null;
    }
  }

  async getPositionsBySymbol(portfolioId: string, symbol: string): Promise<Position[]> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) return [];
    
    return portfolio.positions.filter(p => p.symbol === symbol);
  }

  async getTotalExposure(portfolioId: string): Promise<number> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) return 0;
    
    return portfolio.positions.reduce((total, position) => {
      return total + (position.size * position.currentPrice);
    }, 0);
  }

  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.defaultRiskLimits = { ...this.defaultRiskLimits, ...newLimits };
  }
}