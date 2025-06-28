import type { UserRoleType, SubscriptionTierType, TradingConfig, RiskManagementConfig, RBACOperationResult, PositionSizingMethodType } from '@celebrum-ai/shared';
/**
 * Trading Configuration Manager for managing user trading settings and risk management
 * Handles position sizing, leverage limits, risk tolerance, and trading permissions
 */
export declare class TradingConfigManager {
    private env;
    private defaultRiskProfiles;
    constructor(env: unknown);
    /**
     * Initialize default risk management profiles
     */
    private initializeRiskProfiles;
    /**
     * Create default trading configuration for user
     */
    createDefaultTradingConfig(userId: string, role: UserRoleType, _subscriptionTier: SubscriptionTierType): Promise<TradingConfig>;
    /**
     * Update trading configuration
     */
    updateTradingConfig(userId: string, updates: Partial<TradingConfig>): Promise<RBACOperationResult>;
    /**
     * Update risk management configuration
     */
    updateRiskManagement(userId: string, riskUpdates: Partial<RiskManagementConfig>): Promise<RBACOperationResult>;
    /**
     * Get trading configuration for user
     */
    getTradingConfig(userId: string): Promise<TradingConfig | null>;
    /**
     * Validate trade request against user's configuration
     */
    validateTradeRequest(userId: string, tradeRequest: {
        symbol: string;
        side: 'buy' | 'sell';
        quantity: number;
        price?: number;
        leverage?: number;
        stopLoss?: number;
        takeProfit?: number;
        orderType: 'market' | 'limit' | 'stop';
    }): Promise<RBACOperationResult>;
    /**
     * Calculate optimal position size based on risk management settings
     */
    calculatePositionSize(userId: string, accountBalance: number, riskAmount: number, entryPrice: number, stopLossPrice?: number): Promise<{
        positionSize: number;
        riskPercentage: number;
        method: PositionSizingMethodType;
    } | null>;
    /**
     * Validate configuration updates against role limits
     */
    private validateConfigUpdates;
    /**
     * Validate risk management updates
     */
    private validateRiskManagementUpdates;
    /**
     * Validate risk management for specific trade
     */
    private validateRiskManagementForTrade;
    /**
     * Get role-based trading limits
     */
    private getRoleLimits;
    /**
     * Reset daily trading limits (called by scheduler)
     */
    resetDailyLimits(): Promise<void>;
}
//# sourceMappingURL=trading-config-manager.d.ts.map