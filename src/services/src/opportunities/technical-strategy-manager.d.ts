import { type UserRoleType, type SubscriptionTierType, type RBACOperationResult, type TechnicalStrategy, type StrategyLimits } from '@celebrum-ai/shared';
interface Backtest {
    id: string;
    userId: string;
    strategyId: string;
    startedAt: number;
    completedAt?: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    results?: unknown;
}
/**
 * Technical Strategy Manager for YAML-based strategy system
 * Handles strategy creation, validation, backtesting, and execution limits
 */
export declare class TechnicalStrategyManager {
    private env;
    private strategyCache;
    private backtestQueue;
    constructor(env: unknown);
    /**
     * Create default strategy limits for user
     */
    createDefaultStrategyLimits(userId: string, role: UserRoleType, subscriptionTier: SubscriptionTierType): Promise<StrategyLimits>;
    /**
     * Get strategy limits for user
     */
    getStrategyLimits(userId: string): Promise<StrategyLimits | null>;
    /**
     * Validate strategy operation
     */
    validateStrategyOperation(userId: string, operation: 'create' | 'activate' | 'backtest' | 'delete'): Promise<RBACOperationResult>;
    /**
     * Create a new technical strategy from YAML configuration
     */
    createStrategy(userId: string, strategyConfig: {
        name: string;
        description: string;
        yamlConfig: string;
        symbols: string[];
        timeframes: string[];
        riskLevel: 'low' | 'medium' | 'high';
        isActive: boolean;
    }): Promise<RBACOperationResult>;
    /**
     * Get user's strategies
     */
    getUserStrategies(userId: string, filters?: {
        isActive?: boolean;
        riskLevel?: 'low' | 'medium' | 'high';
        symbols?: string[];
    }): Promise<TechnicalStrategy[]>;
    /**
     * Update strategy configuration
     */
    updateStrategy(userId: string, strategyId: string, updates: Partial<{
        name: string;
        description: string;
        yamlConfig: string;
        symbols: string[];
        timeframes: string[];
        riskLevel: 'low' | 'medium' | 'high';
        isActive: boolean;
    }>): Promise<RBACOperationResult>;
    /**
     * Delete a strategy
     */
    deleteStrategy(userId: string, strategyId: string): Promise<RBACOperationResult>;
    /**
     * Start strategy backtest
     */
    startBacktest(userId: string, strategyId: string, backtestConfig: {
        startDate: number;
        endDate: number;
        initialCapital: number;
        symbols?: string[];
        timeframes?: string[];
    }): Promise<RBACOperationResult>;
    /**
     * Get backtest results
     */
    getBacktestResults(userId: string, backtestId: string): Promise<Backtest | null>;
    /**
     * Get user's backtests
     */
    getUserBacktests(userId: string): Promise<Backtest[]>;
    /**
     * Update strategy limits
     */
    updateStrategyLimits(userId: string, newLimits: Partial<StrategyLimits>): Promise<RBACOperationResult>;
    /**
     * Get tier-based strategy limits
     */
    private getTierLimits;
    /**
     * Validate YAML configuration
     */
    private validateYamlConfig;
    /**
     * Apply filters to strategies
     */
    private applyStrategyFilters;
    /**
     * Simulate backtest execution (in production, this would be a real backtest engine)
     */
    private simulateBacktest;
}
export {};
//# sourceMappingURL=technical-strategy-manager.d.ts.map