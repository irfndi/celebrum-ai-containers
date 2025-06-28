"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnicalStrategyManager = void 0;
// Type guard functions
function isStrategyLimits(value) {
    return typeof value === 'object' && value !== null &&
        'maxStrategies' in value && 'createdStrategies' in value &&
        'maxActiveStrategies' in value && 'activeStrategies' in value &&
        'maxConcurrentBacktests' in value && 'concurrentBacktests' in value;
}
/**
 * Technical Strategy Manager for YAML-based strategy system
 * Handles strategy creation, validation, backtesting, and execution limits
 */
class TechnicalStrategyManager {
    env;
    strategyCache;
    backtestQueue;
    constructor(env) {
        this.env = env;
        this.strategyCache = new Map();
        this.backtestQueue = new Map();
    }
    /**
     * Create default strategy limits for user
     */
    async createDefaultStrategyLimits(userId, role, subscriptionTier) {
        const limits = this.getTierLimits(subscriptionTier);
        const strategyLimits = {
            maxStrategies: limits.maxStrategies,
            createdStrategies: 0,
            maxActiveStrategies: limits.maxActiveStrategies,
            activeStrategies: 0,
            maxConcurrentBacktests: limits.maxConcurrentBacktests,
            concurrentBacktests: 0
        };
        // Store in KV
        const key = `rbac:strategy_limits:${userId}`;
        await this.env.CELEBRUM_KV?.put(key, JSON.stringify(strategyLimits), {
            expirationTtl: 86400 // 24 hours
        });
        return strategyLimits;
    }
    /**
     * Get strategy limits for user
     */
    async getStrategyLimits(userId) {
        try {
            const key = `rbac:strategy_limits:${userId}`;
            const limitsData = await this.env.CELEBRUM_KV?.get(key, 'json');
            return isStrategyLimits(limitsData) ? limitsData : null;
        }
        catch (error) {
            console.error('Failed to get strategy limits:', error);
            return null;
        }
    }
    /**
     * Validate strategy operation
     */
    async validateStrategyOperation(userId, operation) {
        try {
            const limits = await this.getStrategyLimits(userId);
            if (!limits) {
                return {
                    success: false,
                    message: 'Strategy limits not found',
                    timestamp: Date.now(),
                    errors: ['User strategy limits not initialized']
                };
            }
            const now = Date.now();
            switch (operation) {
                case 'create':
                    if (limits.maxStrategies > 0 && limits.createdStrategies >= limits.maxStrategies) {
                        return {
                            success: false,
                            message: 'Maximum strategies limit exceeded',
                            timestamp: now,
                            errors: [`Max strategies: ${limits.maxStrategies}, Created: ${limits.createdStrategies}`]
                        };
                    }
                    break;
                case 'activate':
                    // Check if we can activate more strategies (usually same as max strategies)
                    if (limits.maxStrategies > 0 && limits.activeStrategies >= limits.maxStrategies) {
                        return {
                            success: false,
                            message: 'Maximum active strategies limit exceeded',
                            timestamp: now,
                            errors: [`Max active: ${limits.maxStrategies}, Active: ${limits.activeStrategies}`]
                        };
                    }
                    break;
                case 'backtest':
                    if (limits.maxConcurrentBacktests > 0 && limits.concurrentBacktests >= limits.maxConcurrentBacktests) {
                        return {
                            success: false,
                            message: 'Maximum concurrent backtests limit exceeded',
                            timestamp: now,
                            errors: [`Max backtests: ${limits.maxConcurrentBacktests}, Running: ${limits.concurrentBacktests}`]
                        };
                    }
                    break;
                case 'delete':
                    // Delete operations are generally allowed
                    break;
            }
            return {
                success: true,
                message: `Strategy ${operation} operation validated successfully`,
                timestamp: now,
                data: {
                    remainingStrategies: Math.max(0, limits.maxStrategies - limits.createdStrategies),
                    remainingBacktests: Math.max(0, limits.maxConcurrentBacktests - limits.concurrentBacktests),
                    activeStrategies: limits.activeStrategies
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to validate strategy ${operation}`,
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Create a new technical strategy from YAML configuration
     */
    async createStrategy(userId, strategyConfig) {
        try {
            // Validate operation
            const validation = await this.validateStrategyOperation(userId, 'create');
            if (!validation.success) {
                return validation;
            }
            // Validate YAML configuration
            const yamlValidation = await this.validateYamlConfig(strategyConfig.yamlConfig);
            if (!yamlValidation.success) {
                return yamlValidation;
            }
            const strategyId = `strategy_${userId}_${Date.now()}`;
            const strategy = {
                id: strategyId,
                userId,
                name: strategyConfig.name,
                description: strategyConfig.description,
                version: '1.0.0', // Default version
                yamlConfig: strategyConfig.yamlConfig,
                isActive: strategyConfig.isActive,
                indicators: [], // TODO: Parse from yamlConfig
                conditions: [], // TODO: Parse from yamlConfig
                riskManagement: {
                    maxDailyLossPercent: 5,
                    maxDrawdownPercent: 20,
                    positionSizingMethod: 'percentage_of_portfolio',
                    stopLossRequired: true,
                    takeProfitRecommended: false,
                    trailingStopEnabled: false,
                    riskRewardRatioMin: 1.5
                }, // TODO: Parse from yamlConfig
                createdAt: Date.now(),
                updatedAt: Date.now(),
                backtestResults: []
            };
            // Store strategy
            const strategyKey = `rbac:strategy:${strategyId}`;
            await this.env.CELEBRUM_KV?.put(strategyKey, JSON.stringify(strategy), {
                expirationTtl: 30 * 24 * 60 * 60 // 30 days
            });
            // Add to user's strategy list
            const userStrategiesKey = `rbac:user_strategies:${userId}`;
            const existingStrategies = await this.env.CELEBRUM_KV?.get(userStrategiesKey, 'json') || [];
            existingStrategies.push(strategyId);
            await this.env.CELEBRUM_KV?.put(userStrategiesKey, JSON.stringify(existingStrategies), {
                expirationTtl: 30 * 24 * 60 * 60
            });
            // Update strategy limits
            const limits = await this.getStrategyLimits(userId);
            if (limits) {
                limits.createdStrategies++;
                if (strategyConfig.isActive) {
                    limits.activeStrategies++;
                }
                const limitsKey = `rbac:strategy_limits:${userId}`;
                await this.env.CELEBRUM_KV?.put(limitsKey, JSON.stringify(limits), {
                    expirationTtl: 86400
                });
            }
            return {
                success: true,
                message: 'Strategy created successfully',
                timestamp: Date.now(),
                data: {
                    strategyId,
                    strategy: {
                        id: strategy.id,
                        name: strategy.name,
                        isActive: strategy.isActive
                        // TODO: Add riskLevel property to TechnicalStrategy schema if needed
                    }
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to create strategy',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Get user's strategies
     */
    async getUserStrategies(userId, filters) {
        try {
            const userStrategiesKey = `rbac:user_strategies:${userId}`;
            const strategyIds = await this.env.CELEBRUM_KV?.get(userStrategiesKey, 'json') || [];
            const strategies = [];
            for (const strategyId of strategyIds) {
                const strategyKey = `rbac:strategy:${strategyId}`;
                const strategy = await this.env.CELEBRUM_KV?.get(strategyKey, 'json');
                if (strategy) {
                    strategies.push(strategy);
                }
            }
            // Apply filters
            if (filters) {
                return this.applyStrategyFilters(strategies, filters);
            }
            return strategies;
        }
        catch (error) {
            console.error('Failed to get user strategies:', error);
            return [];
        }
    }
    /**
     * Update strategy configuration
     */
    async updateStrategy(userId, strategyId, updates) {
        try {
            const strategyKey = `rbac:strategy:${strategyId}`;
            const strategy = await this.env.CELEBRUM_KV?.get(strategyKey, 'json');
            if (!strategy || strategy.userId !== userId) {
                return {
                    success: false,
                    message: 'Strategy not found or access denied',
                    timestamp: Date.now(),
                    errors: ['Strategy not found or user does not have access']
                };
            }
            // Validate YAML if being updated
            if (updates.yamlConfig) {
                const yamlValidation = await this.validateYamlConfig(updates.yamlConfig);
                if (!yamlValidation.success) {
                    return yamlValidation;
                }
            }
            // Check activation limits if activating
            if (updates.isActive === true && !strategy.isActive) {
                const validation = await this.validateStrategyOperation(userId, 'activate');
                if (!validation.success) {
                    return validation;
                }
            }
            // Update strategy
            const updatedStrategy = {
                ...strategy,
                ...updates,
                updatedAt: Date.now()
            };
            await this.env.CELEBRUM_KV?.put(strategyKey, JSON.stringify(updatedStrategy), {
                expirationTtl: 30 * 24 * 60 * 60
            });
            // Update active strategy count if status changed
            if (updates.isActive !== undefined && updates.isActive !== strategy.isActive) {
                const limits = await this.getStrategyLimits(userId);
                if (limits) {
                    if (updates.isActive) {
                        limits.activeStrategies++;
                    }
                    else {
                        limits.activeStrategies = Math.max(0, limits.activeStrategies - 1);
                    }
                    const limitsKey = `rbac:strategy_limits:${userId}`;
                    await this.env.CELEBRUM_KV?.put(limitsKey, JSON.stringify(limits), {
                        expirationTtl: 86400
                    });
                }
            }
            return {
                success: true,
                message: 'Strategy updated successfully',
                timestamp: Date.now(),
                data: {
                    strategyId,
                    updatedFields: Object.keys(updates)
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to update strategy',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Delete a strategy
     */
    async deleteStrategy(userId, strategyId) {
        try {
            const strategyKey = `rbac:strategy:${strategyId}`;
            const strategy = await this.env.CELEBRUM_KV?.get(strategyKey, 'json');
            if (!strategy || strategy.userId !== userId) {
                return {
                    success: false,
                    message: 'Strategy not found or access denied',
                    timestamp: Date.now(),
                    errors: ['Strategy not found or user does not have access']
                };
            }
            // Delete strategy
            await this.env.CELEBRUM_KV?.delete(strategyKey);
            // Remove from user's strategy list
            const userStrategiesKey = `rbac:user_strategies:${userId}`;
            const existingStrategies = await this.env.CELEBRUM_KV?.get(userStrategiesKey, 'json') || [];
            const updatedStrategies = existingStrategies.filter((id) => id !== strategyId);
            await this.env.CELEBRUM_KV?.put(userStrategiesKey, JSON.stringify(updatedStrategies), {
                expirationTtl: 30 * 24 * 60 * 60
            });
            // Update strategy limits
            const limits = await this.getStrategyLimits(userId);
            if (limits) {
                limits.createdStrategies = Math.max(0, limits.createdStrategies - 1);
                if (strategy.isActive) {
                    limits.activeStrategies = Math.max(0, limits.activeStrategies - 1);
                }
                const limitsKey = `rbac:strategy_limits:${userId}`;
                await this.env.CELEBRUM_KV?.put(limitsKey, JSON.stringify(limits), {
                    expirationTtl: 86400
                });
            }
            return {
                success: true,
                message: 'Strategy deleted successfully',
                timestamp: Date.now(),
                data: { strategyId }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to delete strategy',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Start strategy backtest
     */
    async startBacktest(userId, strategyId, backtestConfig) {
        try {
            // Validate operation
            const validation = await this.validateStrategyOperation(userId, 'backtest');
            if (!validation.success) {
                return validation;
            }
            const strategyKey = `rbac:strategy:${strategyId}`;
            const strategy = await this.env.CELEBRUM_KV?.get(strategyKey, 'json');
            if (!strategy || strategy.userId !== userId) {
                return {
                    success: false,
                    message: 'Strategy not found or access denied',
                    timestamp: Date.now(),
                    errors: ['Strategy not found or user does not have access']
                };
            }
            const backtestId = `backtest_${strategyId}_${Date.now()}`;
            const backtest = {
                id: backtestId,
                strategyId,
                userId,
                config: backtestConfig,
                status: 'running',
                startedAt: Date.now(),
                completedAt: null,
                results: null,
                progress: 0
            };
            // Store backtest
            const backtestKey = `rbac:backtest:${backtestId}`;
            await this.env.CELEBRUM_KV?.put(backtestKey, JSON.stringify(backtest), {
                expirationTtl: 7 * 24 * 60 * 60 // 7 days
            });
            // Add to user's backtest list
            const userBacktestsKey = `rbac:user_backtests:${userId}`;
            const existingBacktests = await this.env.CELEBRUM_KV?.get(userBacktestsKey, 'json') || [];
            existingBacktests.push(backtestId);
            await this.env.CELEBRUM_KV?.put(userBacktestsKey, JSON.stringify(existingBacktests), {
                expirationTtl: 7 * 24 * 60 * 60
            });
            // Update running backtest count
            const limits = await this.getStrategyLimits(userId);
            if (limits) {
                limits.concurrentBacktests++;
                const limitsKey = `rbac:strategy_limits:${userId}`;
                await this.env.CELEBRUM_KV?.put(limitsKey, JSON.stringify(limits), {
                    expirationTtl: 86400
                });
            }
            // In production, this would trigger the actual backtest process
            // For now, we'll simulate it with a timeout
            this.simulateBacktest(backtestId, userId);
            return {
                success: true,
                message: 'Backtest started successfully',
                timestamp: Date.now(),
                data: {
                    backtestId,
                    strategyId,
                    estimatedDuration: '5-10 minutes'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to start backtest',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Get backtest results
     */
    async getBacktestResults(userId, backtestId) {
        try {
            const backtestKey = `rbac:backtest:${backtestId}`;
            const backtestData = await this.env.CELEBRUM_KV?.get(backtestKey, 'json');
            if (!backtestData) {
                return null;
            }
            const backtest = backtestData;
            if (backtest.userId !== userId) {
                return null;
            }
            return backtest;
        }
        catch (error) {
            console.error('Failed to get backtest results:', error);
            return null;
        }
    }
    /**
     * Get user's backtests
     */
    async getUserBacktests(userId) {
        try {
            const userBacktestsKey = `rbac:user_backtests:${userId}`;
            const backtestIdsData = await this.env.CELEBRUM_KV?.get(userBacktestsKey, 'json') || [];
            const backtestIds = backtestIdsData;
            const backtests = [];
            for (const backtestId of backtestIds) {
                const backtestKey = `rbac:backtest:${backtestId}`;
                const backtestData = await this.env.CELEBRUM_KV?.get(backtestKey, 'json');
                if (backtestData) {
                    const backtest = backtestData;
                    backtests.push(backtest);
                }
            }
            return backtests.sort((a, b) => b.startedAt - a.startedAt);
        }
        catch (error) {
            console.error('Failed to get user backtests:', error);
            return [];
        }
    }
    /**
     * Update strategy limits
     */
    async updateStrategyLimits(userId, newLimits) {
        try {
            const existingLimits = await this.getStrategyLimits(userId);
            if (!existingLimits) {
                return {
                    success: false,
                    message: 'Strategy limits not found',
                    timestamp: Date.now(),
                    errors: ['User strategy limits not initialized']
                };
            }
            const updatedLimits = {
                ...existingLimits,
                ...newLimits
            };
            // Store updated limits
            const key = `rbac:strategy_limits:${userId}`;
            await this.env.CELEBRUM_KV?.put(key, JSON.stringify(updatedLimits), {
                expirationTtl: 86400
            });
            return {
                success: true,
                message: 'Strategy limits updated successfully',
                timestamp: Date.now(),
                data: updatedLimits
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to update strategy limits',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Get tier-based strategy limits
     */
    getTierLimits(tier) {
        switch (tier) {
            case 'free':
                return { maxStrategies: 3, maxActiveStrategies: 2, maxConcurrentBacktests: 1 };
            case 'pro':
                return { maxStrategies: 10, maxActiveStrategies: 5, maxConcurrentBacktests: 3 };
            case 'ultra':
                return { maxStrategies: 50, maxActiveStrategies: 20, maxConcurrentBacktests: 10 };
            case 'enterprise':
                return { maxStrategies: -1, maxActiveStrategies: -1, maxConcurrentBacktests: -1 }; // unlimited
            default:
                return { maxStrategies: 3, maxActiveStrategies: 2, maxConcurrentBacktests: 1 };
        }
    }
    /**
     * Validate YAML configuration
     */
    async validateYamlConfig(yamlConfig) {
        try {
            // Basic YAML validation - in production, use a proper YAML parser
            if (!yamlConfig || yamlConfig.trim().length === 0) {
                return {
                    success: false,
                    message: 'YAML configuration is required',
                    timestamp: Date.now(),
                    errors: ['Empty YAML configuration']
                };
            }
            // Check for required sections
            const requiredSections = ['strategy', 'indicators', 'signals', 'risk_management'];
            const missingSections = requiredSections.filter(section => !yamlConfig.includes(`${section}:`));
            if (missingSections.length > 0) {
                return {
                    success: false,
                    message: 'YAML configuration missing required sections',
                    timestamp: Date.now(),
                    errors: [`Missing sections: ${missingSections.join(', ')}`]
                };
            }
            // Additional validation can be added here
            // - Check for valid indicator names
            // - Validate parameter ranges
            // - Check for circular dependencies
            return {
                success: true,
                message: 'YAML configuration is valid',
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to validate YAML configuration',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Apply filters to strategies
     */
    applyStrategyFilters(strategies, filters) {
        return strategies.filter(strategy => {
            if (filters.isActive !== undefined && strategy.isActive !== filters.isActive) {
                return false;
            }
            // TODO: Implement riskLevel filtering when TechnicalStrategy schema supports riskLevel
            // if (filters.riskLevel && strategy.riskLevel !== filters.riskLevel) {
            //   return false;
            // }
            // TODO: Implement symbols filtering when TechnicalStrategy schema supports symbols
            // if (filters.symbols && filters.symbols.length > 0) {
            //   const hasMatchingSymbol = strategy.symbols.some((symbol: string) => 
            //     filters.symbols!.includes(symbol)
            //   );
            //   if (!hasMatchingSymbol) {
            //     return false;
            //   }
            // }
            return true;
        });
    }
    /**
     * Simulate backtest execution (in production, this would be a real backtest engine)
     */
    async simulateBacktest(backtestId, userId) {
        try {
            // Simulate backtest execution with random results
            setTimeout(async () => {
                const backtestKey = `rbac:backtest:${backtestId}`;
                const backtestData = await this.env.CELEBRUM_KV?.get(backtestKey, 'json');
                if (backtestData) {
                    const backtest = backtestData;
                    // Generate mock results
                    const results = {
                        totalTrades: Math.floor(Math.random() * 100) + 50,
                        winRate: Math.random() * 0.4 + 0.4, // 40-80%
                        profitLoss: (Math.random() - 0.3) * 10000, // -3000 to 7000
                        maxDrawdown: Math.random() * 0.2, // 0-20%
                        sharpeRatio: Math.random() * 2 + 0.5, // 0.5-2.5
                        trades: [] // In production, this would contain detailed trade data
                    };
                    backtest.status = 'completed';
                    backtest.completedAt = Date.now();
                    backtest.results = results;
                    backtest.progress = 100;
                    await this.env.CELEBRUM_KV?.put(backtestKey, JSON.stringify(backtest), {
                        expirationTtl: 7 * 24 * 60 * 60
                    });
                    // Update running backtest count
                    const limits = await this.getStrategyLimits(userId);
                    if (limits) {
                        limits.concurrentBacktests = Math.max(0, limits.concurrentBacktests - 1);
                        const limitsKey = `rbac:strategy_limits:${userId}`;
                        await this.env.CELEBRUM_KV?.put(limitsKey, JSON.stringify(limits), {
                            expirationTtl: 86400
                        });
                    }
                }
            }, 30000); // 30 seconds simulation
        }
        catch (error) {
            console.error('Failed to simulate backtest:', error);
        }
    }
}
exports.TechnicalStrategyManager = TechnicalStrategyManager;
//# sourceMappingURL=technical-strategy-manager.js.map