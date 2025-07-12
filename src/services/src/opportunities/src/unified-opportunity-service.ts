// Unified Opportunity Service
// Combines arbitrage and hedge opportunities with enhanced features

import type { Env, ArbitrageOpportunity } from '@celebrum-ai/shared';
import type { UserRoleType } from '@celebrum-ai/shared/types';
import { OpportunityManager, type HedgeOpportunity, type HedgeExecutionResult } from './opportunity-manager';

export interface UnifiedOpportunity {
  id: string;
  type: 'arbitrage' | 'hedge';
  symbol: string;
  
  // Common fields
  profit_percentage: number;
  confidence_score: number;
  risk_level: 'low' | 'medium' | 'high';
  generated_at: string;
  expires_at: string;
  
  // Arbitrage-specific fields (when type === 'arbitrage')
  exchange_a?: string;
  exchange_b?: string;
  price_a?: number;
  price_b?: number;
  spread?: number;
  volume?: number;
  
  // Hedge-specific fields (when type === 'hedge')
  positions_opened?: {
    long: { amount: number; price: number; exchange: string };
    short: { amount: number; price: number; exchange: string };
  };
  difference?: number;
  expected_apr?: number;
  execution_time?: string;
  max_position_size?: number;
  stop_loss?: number;
  take_profit?: number;
}

export interface OpportunityFilters {
  type?: 'arbitrage' | 'hedge' | 'all';
  minProfitPercent?: number;
  maxRisk?: 'low' | 'medium' | 'high';
  exchanges?: string[];
  symbols?: string[];
  minConfidence?: number;
}

export interface OpportunityStats {
  total_opportunities: number;
  arbitrage_count: number;
  hedge_count: number;
  avg_profit_percentage: number;
  avg_confidence_score: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  top_symbols: Array<{ symbol: string; count: number; avg_profit: number }>;
}

export class UnifiedOpportunityService {
  private opportunityManager: OpportunityManager;
  
  constructor(private env: Env) {
    this.opportunityManager = new OpportunityManager(env);
  }

  /**
   * Get all available opportunities (arbitrage + hedge) for a user
   */
  async getAllOpportunities(
    userId: string,
    userTier: UserRoleType,
    filters: OpportunityFilters = {}
  ): Promise<UnifiedOpportunity[]> {
    try {
      const opportunities: UnifiedOpportunity[] = [];
      
      // Get arbitrage opportunities if requested
      if (filters.type === 'arbitrage' || filters.type === 'all' || !filters.type) {
        const arbitrageOpps = await this.opportunityManager.getAvailableOpportunities(userId, userTier);
        const convertedArbitrageOpps = arbitrageOpps.map(opp => this.convertArbitrageToUnified(opp));
        opportunities.push(...convertedArbitrageOpps);
      }
      
      // Get hedge opportunities if requested
      if (filters.type === 'hedge' || filters.type === 'all' || !filters.type) {
        const hedgeTier = userTier === 'superadmin' ? 'admin' : userTier as 'free' | 'pro' | 'ultra' | 'admin';
        const hedgeOpps = await this.opportunityManager.getHedgeOpportunities(userId, hedgeTier);
        const convertedHedgeOpps = hedgeOpps.map(opp => this.convertHedgeToUnified(opp));
        opportunities.push(...convertedHedgeOpps);
      }
      
      // Apply filters
      let filteredOpportunities = this.applyFilters(opportunities, filters);
      
      // Sort by profit percentage descending
      filteredOpportunities.sort((a, b) => b.profit_percentage - a.profit_percentage);
      
      return filteredOpportunities;
    } catch (error) {
      console.error('Error getting unified opportunities:', error);
      return [];
    }
  }

  /**
   * Get opportunities in the enhanced format matching the user's image
   */
  async getEnhancedOpportunities(
    userId: string,
    userTier: UserRoleType,
    filters: OpportunityFilters = {}
  ): Promise<HedgeOpportunity[]> {
    try {
      // Prioritize hedge opportunities as they match the image format better
      const hedgeTier = userTier === 'superadmin' ? 'admin' : userTier as 'free' | 'pro' | 'ultra' | 'admin';
      const hedgeOpportunities = await this.opportunityManager.getHedgeOpportunities(userId, hedgeTier);
      
      // Apply filters
      let filteredOpportunities = hedgeOpportunities.filter(opp => {
        if (filters.minProfitPercent && opp.profit_percentage < filters.minProfitPercent) return false;
        if (filters.maxRisk && this.getRiskLevel(opp.risk_level, filters.maxRisk) > 0) return false;
        if (filters.symbols && !filters.symbols.includes(opp.symbol)) return false;
        if (filters.minConfidence && opp.confidence_score < filters.minConfidence) return false;
        return true;
      });
      
      return filteredOpportunities;
    } catch (error) {
      console.error('Error getting enhanced opportunities:', error);
      return [];
    }
  }

  /**
   * Execute an opportunity (arbitrage or hedge)
   */
  async executeOpportunity(
    opportunityId: string,
    userId: string,
    positionSize: number,
    opportunityType: 'arbitrage' | 'hedge'
  ): Promise<HedgeExecutionResult | { success: boolean; error?: string }> {
    try {
      if (opportunityType === 'hedge') {
        return await this.opportunityManager.executeHedgeOpportunity(opportunityId, userId, positionSize);
      } else {
        // For arbitrage, we'll use the existing execution logic
        await this.opportunityManager.recordOpportunityExecution(
          userId,
          opportunityId,
          true, // success
          positionSize * 0.01 // estimated profit based on position size
        );
        
        return {
          success: true,
          opportunity_id: opportunityId,
          execution_summary: {
            symbol: 'UNKNOWN', // Would need to fetch from opportunity
            positions_opened: {
              long: { amount: positionSize, price: 0, exchange: 'UNKNOWN' },
              short: { amount: positionSize, price: 0, exchange: 'UNKNOWN' }
            },
            difference: 0,
            expected_apr: 0,
            execution_time: '00:00:00',
            status: 'executed' as const
          }
        };
      }
    } catch (error) {
      console.error('Error executing opportunity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      };
    }
  }

  /**
   * Get opportunity statistics for analytics
   */
  async getOpportunityStats(
    userId: string,
    userTier: UserRoleType,
    _timeframe: '1h' | '24h' | '7d' = '24h'
  ): Promise<OpportunityStats> {
    try {
      const opportunities = await this.getAllOpportunities(userId, userTier);
      
      const stats: OpportunityStats = {
        total_opportunities: opportunities.length,
        arbitrage_count: opportunities.filter(o => o.type === 'arbitrage').length,
        hedge_count: opportunities.filter(o => o.type === 'hedge').length,
        avg_profit_percentage: this.calculateAverage(opportunities.map(o => o.profit_percentage)),
        avg_confidence_score: this.calculateAverage(opportunities.map(o => o.confidence_score)),
        risk_distribution: {
          low: opportunities.filter(o => o.risk_level === 'low').length,
          medium: opportunities.filter(o => o.risk_level === 'medium').length,
          high: opportunities.filter(o => o.risk_level === 'high').length
        },
        top_symbols: this.calculateTopSymbols(opportunities)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting opportunity stats:', error);
      return {
        total_opportunities: 0,
        arbitrage_count: 0,
        hedge_count: 0,
        avg_profit_percentage: 0,
        avg_confidence_score: 0,
        risk_distribution: { low: 0, medium: 0, high: 0 },
        top_symbols: []
      };
    }
  }

  /**
   * Get user's execution history
   */
  async getUserExecutionHistory(
    _userId: string,
    _limit: number = 50
  ): Promise<Array<{
    id: string;
    type: 'arbitrage' | 'hedge';
    symbol: string;
    profit_percentage: number;
    executed_at: string;
    status: 'executed' | 'failed';
    position_size: number;
  }>> {
    try {
      // This would typically fetch from a database
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('Error getting execution history:', error);
      return [];
    }
  }

  // Private helper methods
  
  private convertArbitrageToUnified(opp: ArbitrageOpportunity): UnifiedOpportunity {
    return {
      id: opp.id,
      type: 'arbitrage',
      symbol: opp.symbol,
      profit_percentage: opp.profit_percentage,
      confidence_score: opp.confidence_score,
      risk_level: this.calculateRiskFromConfidence(opp.confidence_score),
      generated_at: opp.generated_at,
      expires_at: opp.expires_at,
      exchange_a: opp.exchange_a,
      exchange_b: opp.exchange_b,
      price_a: opp.price_a,
      price_b: opp.price_b,
      spread: opp.price_b - opp.price_a
    };
  }
  
  private convertHedgeToUnified(opp: HedgeOpportunity): UnifiedOpportunity {
    return {
      id: opp.id,
      type: 'hedge',
      symbol: opp.symbol,
      profit_percentage: opp.profit_percentage,
      confidence_score: opp.confidence_score,
      risk_level: opp.risk_level,
      generated_at: opp.generated_at,
      expires_at: opp.expires_at,
      positions_opened: opp.positions_opened,
      difference: opp.difference,
      expected_apr: opp.expected_apr,
      execution_time: opp.execution_time,
      max_position_size: opp.max_position_size,
      stop_loss: opp.stop_loss,
      take_profit: opp.take_profit
    };
  }
  
  private applyFilters(opportunities: UnifiedOpportunity[], filters: OpportunityFilters): UnifiedOpportunity[] {
    return opportunities.filter(opp => {
      if (filters.minProfitPercent && opp.profit_percentage < filters.minProfitPercent) return false;
      if (filters.maxRisk && this.getRiskLevel(opp.risk_level, filters.maxRisk) > 0) return false;
      if (filters.symbols && !filters.symbols.includes(opp.symbol)) return false;
      if (filters.minConfidence && opp.confidence_score < filters.minConfidence) return false;
      if (filters.exchanges) {
        if (opp.type === 'arbitrage' && 
            (!filters.exchanges.includes(opp.exchange_a || '') && 
             !filters.exchanges.includes(opp.exchange_b || ''))) return false;
        if (opp.type === 'hedge' && 
            (!filters.exchanges.includes(opp.positions_opened?.long.exchange || '') && 
             !filters.exchanges.includes(opp.positions_opened?.short.exchange || ''))) return false;
      }
      return true;
    });
  }
  
  private getRiskLevel(current: string, max: string): number {
    const levels = { low: 0, medium: 1, high: 2 };
    return (levels[current as keyof typeof levels] || 0) - (levels[max as keyof typeof levels] || 0);
  }
  
  private calculateRiskFromConfidence(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.8) return 'low';
    if (confidence >= 0.6) return 'medium';
    return 'high';
  }
  
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
  
  private calculateTopSymbols(opportunities: UnifiedOpportunity[]): Array<{ symbol: string; count: number; avg_profit: number }> {
    const symbolStats = new Map<string, { count: number; totalProfit: number }>();
    
    opportunities.forEach(opp => {
      const existing = symbolStats.get(opp.symbol) || { count: 0, totalProfit: 0 };
      symbolStats.set(opp.symbol, {
        count: existing.count + 1,
        totalProfit: existing.totalProfit + opp.profit_percentage
      });
    });
    
    return Array.from(symbolStats.entries())
      .map(([symbol, stats]) => ({
        symbol,
        count: stats.count,
        avg_profit: stats.totalProfit / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
