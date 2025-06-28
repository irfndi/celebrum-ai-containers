"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACService = void 0;
const types_1 = require("../types");
/**
 * Comprehensive RBAC Service for ArbEdge
 * Manages user roles, permissions, API access, trading configurations, and feature flags
 */
class RBACService {
    env;
    rolePermissions;
    tierLimits;
    featureFlags;
    constructor(env) {
        this.env = env;
        this.rolePermissions = new Map();
        this.tierLimits = new Map();
        this.featureFlags = new Map();
        this.initializeRolePermissions();
        this.initializeTierLimits();
        this.initializeFeatureFlags();
    }
    /**
     * Initialize role-based permissions matrix
     */
    initializeRolePermissions() {
        this.rolePermissions.set(types_1.UserRole.FREE, [
            types_1.Permission.READ_PROFILE,
            types_1.Permission.UPDATE_PROFILE,
            types_1.Permission.TRADE_VIEW_POSITIONS,
            types_1.Permission.OPPORTUNITY_VIEW,
            types_1.Permission.STRATEGY_VIEW
        ]);
        this.rolePermissions.set(types_1.UserRole.PRO, [
            ...this.rolePermissions.get(types_1.UserRole.FREE),
            types_1.Permission.TRADE_MANUAL,
            types_1.Permission.API_EXCHANGE_ACCESS,
            types_1.Permission.OPPORTUNITY_EXECUTE,
            types_1.Permission.STRATEGY_CREATE,
            types_1.Permission.STRATEGY_BACKTEST
        ]);
        this.rolePermissions.set(types_1.UserRole.ULTRA, [
            ...this.rolePermissions.get(types_1.UserRole.PRO),
            types_1.Permission.TRADE_AUTO,
            types_1.Permission.TRADE_MANAGE_CONFIG,
            types_1.Permission.API_AI_ACCESS,
            types_1.Permission.API_MANAGE_KEYS,
            types_1.Permission.OPPORTUNITY_CREATE_ALERTS,
            types_1.Permission.STRATEGY_EXECUTE
        ]);
        this.rolePermissions.set(types_1.UserRole.ADMIN, [
            ...this.rolePermissions.get(types_1.UserRole.ULTRA),
            types_1.Permission.ADMIN_USER_MANAGEMENT,
            types_1.Permission.ADMIN_VIEW_ANALYTICS,
            types_1.Permission.ADMIN_MANAGE_FEATURES
        ]);
        this.rolePermissions.set(types_1.UserRole.SUPERADMIN, [
            ...this.rolePermissions.get(types_1.UserRole.ADMIN),
            types_1.Permission.ADMIN_SYSTEM_CONFIG,
            types_1.Permission.SUPERADMIN_FULL_ACCESS
        ]);
    }
    /**
     * Initialize subscription tier limits
     */
    initializeTierLimits() {
        this.tierLimits.set(types_1.SubscriptionTier.FREE, {
            maxExchangeApis: 1,
            maxAiApis: 0,
            dailyRequestLimit: 100,
            hourlyRequestLimit: 20,
            maxConcurrentTrades: 1,
            maxLeverage: 3,
            maxStrategies: 1,
            maxActiveStrategies: 0,
            maxConcurrentBacktests: 1,
            dailyOpportunityLimit: 10,
            hourlyOpportunityLimit: 5
        });
        this.tierLimits.set(types_1.SubscriptionTier.PRO, {
            maxExchangeApis: 3,
            maxAiApis: 1,
            dailyRequestLimit: 1000,
            hourlyRequestLimit: 200,
            maxConcurrentTrades: 5,
            maxLeverage: 10,
            maxStrategies: 5,
            maxActiveStrategies: 2,
            maxConcurrentBacktests: 3,
            dailyOpportunityLimit: 100,
            hourlyOpportunityLimit: 25
        });
        this.tierLimits.set(types_1.SubscriptionTier.ULTRA, {
            maxExchangeApis: 10,
            maxAiApis: 3,
            dailyRequestLimit: 10000,
            hourlyRequestLimit: 1000,
            maxConcurrentTrades: 20,
            maxLeverage: 50,
            maxStrategies: 20,
            maxActiveStrategies: 10,
            maxConcurrentBacktests: 10,
            dailyOpportunityLimit: 1000,
            hourlyOpportunityLimit: 100
        });
        this.tierLimits.set(types_1.SubscriptionTier.ENTERPRISE, {
            maxExchangeApis: -1, // unlimited
            maxAiApis: -1,
            dailyRequestLimit: -1,
            hourlyRequestLimit: -1,
            maxConcurrentTrades: 100,
            maxLeverage: 100,
            maxStrategies: -1,
            maxActiveStrategies: -1,
            maxConcurrentBacktests: -1,
            dailyOpportunityLimit: -1,
            hourlyOpportunityLimit: -1
        });
    }
    /**
     * Initialize feature flags
     */
    initializeFeatureFlags() {
        this.featureFlags.set('rbac.enabled', true);
        this.featureFlags.set('api_access.enabled', true);
        this.featureFlags.set('trading.enabled', true);
        this.featureFlags.set('opportunity_engine.enabled', true);
        this.featureFlags.set('technical_strategies.enabled', true);
        this.featureFlags.set('auto_trading.enabled', true);
        this.featureFlags.set('advanced_analytics.enabled', true);
        this.featureFlags.set('yaml_strategies.enabled', true);
    }
    /**
     * Check if user has specific permission
     */
    hasPermission(role, permission) {
        const permissions = this.rolePermissions.get(role);
        return permissions ? permissions.includes(permission) : false;
    }
    /**
     * Get all permissions for a role
     */
    getRolePermissions(role) {
        return this.rolePermissions.get(role) || [];
    }
    /**
     * Get tier limits for subscription
     */
    getTierLimits(tier) {
        const limits = this.tierLimits.get(tier) || this.tierLimits.get(types_1.SubscriptionTier.FREE);
        if (!limits) {
            throw new Error('No tier limits found for any subscription tier');
        }
        return limits;
    }
    /**
     * Check if feature flag is enabled
     */
    isFeatureEnabled(flag) {
        return this.featureFlags.get(flag) || false;
    }
    /**
     * Create comprehensive user access summary
     */
    async createUserAccessSummary(userId, role, subscriptionTier) {
        const permissions = this.getRolePermissions(role);
        const limits = this.getTierLimits(subscriptionTier);
        const timestamp = Date.now();
        // Get or create API access configuration
        const apiAccess = await this.getOrCreateApiAccess(userId, role, limits);
        // Get or create trading configuration
        const tradingConfig = await this.getOrCreateTradingConfig(userId, role, limits);
        // Create opportunity limits
        const opportunityLimits = {
            dailyLimit: limits.dailyOpportunityLimit,
            dailyUsed: 0,
            hourlyLimit: limits.hourlyOpportunityLimit,
            hourlyUsed: 0,
            totalAccessed: 0,
            successRate: 0
        };
        // Create strategy limits
        const strategyLimits = {
            maxStrategies: limits.maxStrategies,
            createdStrategies: 0,
            maxActiveStrategies: limits.maxActiveStrategies,
            activeStrategies: 0,
            maxConcurrentBacktests: limits.maxConcurrentBacktests,
            concurrentBacktests: 0
        };
        // Get feature flags as object
        const featureFlags = {};
        this.featureFlags.forEach((value, key) => {
            featureFlags[key] = value;
        });
        return {
            userId,
            role,
            subscriptionTier,
            permissions,
            apiAccess,
            tradingConfig,
            opportunityLimits,
            strategyLimits,
            featureFlags,
            lastUpdated: timestamp
        };
    }
    /**
     * Get or create API access configuration
     */
    async getOrCreateApiAccess(userId, role, limits) {
        const key = `rbac:api_access:${userId}`;
        try {
            const existing = await this.env.CELEBRUM_KV?.get(key, 'json');
            if (existing) {
                return existing;
            }
        }
        catch (error) {
            console.warn('Failed to get existing API access:', error);
        }
        // Create new API access configuration
        const apiAccess = {
            userId,
            role,
            exchangeApis: [],
            aiApis: [],
            limits: {
                maxExchangeApis: limits.maxExchangeApis,
                maxAiApis: limits.maxAiApis,
                dailyRequestLimit: limits.dailyRequestLimit,
                hourlyRequestLimit: limits.hourlyRequestLimit
            },
            usage: {
                dailyRequests: 0,
                hourlyRequests: 0,
                totalRequests: 0,
                lastReset: Date.now()
            },
            lastUpdated: Date.now()
        };
        // Store in KV
        await this.env.CELEBRUM_KV?.put(key, JSON.stringify(apiAccess), {
            expirationTtl: 86400 // 24 hours
        });
        return apiAccess;
    }
    /**
     * Get or create trading configuration
     */
    async getOrCreateTradingConfig(userId, role, limits) {
        // Only create trading config for roles that can trade
        if (!this.hasPermission(role, types_1.Permission.TRADE_MANUAL) && !this.hasPermission(role, types_1.Permission.TRADE_AUTO)) {
            return undefined;
        }
        const key = `rbac:trading_config:${userId}`;
        try {
            const existing = await this.env.CELEBRUM_KV?.get(key, 'json');
            if (existing) {
                return existing;
            }
        }
        catch (error) {
            console.warn('Failed to get existing trading config:', error);
        }
        // Create default risk management config based on role
        const riskManagement = {
            maxDailyLossPercent: role === types_1.UserRole.FREE ? 5 : role === types_1.UserRole.PRO ? 10 : 20,
            maxDrawdownPercent: role === types_1.UserRole.FREE ? 10 : role === types_1.UserRole.PRO ? 15 : 25,
            positionSizingMethod: 'percentage_of_portfolio',
            stopLossRequired: role === types_1.UserRole.FREE,
            takeProfitRecommended: true,
            trailingStopEnabled: role !== types_1.UserRole.FREE,
            riskRewardRatioMin: 1.5
        };
        // Create new trading configuration
        const tradingConfig = {
            userId,
            role,
            percentagePerTrade: role === types_1.UserRole.FREE ? 2 : role === types_1.UserRole.PRO ? 5 : 10,
            maxConcurrentTrades: limits.maxConcurrentTrades,
            maxLeverage: limits.maxLeverage,
            riskTolerance: 'medium',
            autoTradingEnabled: this.hasPermission(role, types_1.Permission.TRADE_AUTO),
            manualTradingEnabled: this.hasPermission(role, types_1.Permission.TRADE_MANUAL),
            riskManagement,
            lastUpdated: Date.now()
        };
        // Store in KV
        await this.env.CELEBRUM_KV?.put(key, JSON.stringify(tradingConfig), {
            expirationTtl: 86400 // 24 hours
        });
        return tradingConfig;
    }
    /**
     * Validate API access request
     */
    async validateApiAccess(userId, apiType) {
        try {
            const key = `rbac:api_access:${userId}`;
            const apiAccess = await this.env.CELEBRUM_KV?.get(key, 'json');
            if (!apiAccess) {
                return {
                    success: false,
                    message: 'API access configuration not found',
                    timestamp: Date.now(),
                    errors: ['User API access not configured']
                };
            }
            // Check daily limits
            const now = Date.now();
            const daysSinceReset = Math.floor((now - apiAccess.usage.lastReset) / (24 * 60 * 60 * 1000));
            if (daysSinceReset >= 1) {
                // Reset daily counters
                apiAccess.usage.dailyRequests = 0;
                apiAccess.usage.lastReset = now;
            }
            // Check hourly limits
            const hoursSinceReset = Math.floor((now - apiAccess.usage.lastReset) / (60 * 60 * 1000));
            if (hoursSinceReset >= 1) {
                apiAccess.usage.hourlyRequests = 0;
            }
            // Validate limits
            if (apiAccess.limits.dailyRequestLimit > 0 && apiAccess.usage.dailyRequests >= apiAccess.limits.dailyRequestLimit) {
                return {
                    success: false,
                    message: 'Daily API request limit exceeded',
                    timestamp: now,
                    errors: ['Daily limit exceeded']
                };
            }
            if (apiAccess.limits.hourlyRequestLimit > 0 && apiAccess.usage.hourlyRequests >= apiAccess.limits.hourlyRequestLimit) {
                return {
                    success: false,
                    message: 'Hourly API request limit exceeded',
                    timestamp: now,
                    errors: ['Hourly limit exceeded']
                };
            }
            // Check API type specific limits
            if (apiType === 'exchange' && apiAccess.limits.maxExchangeApis > 0 && apiAccess.exchangeApis.length >= apiAccess.limits.maxExchangeApis) {
                return {
                    success: false,
                    message: 'Maximum exchange APIs limit reached',
                    timestamp: now,
                    errors: ['Exchange API limit exceeded']
                };
            }
            if (apiType === 'ai' && apiAccess.limits.maxAiApis > 0 && apiAccess.aiApis.length >= apiAccess.limits.maxAiApis) {
                return {
                    success: false,
                    message: 'Maximum AI APIs limit reached',
                    timestamp: now,
                    errors: ['AI API limit exceeded']
                };
            }
            // Update usage counters
            apiAccess.usage.dailyRequests++;
            apiAccess.usage.hourlyRequests++;
            apiAccess.usage.totalRequests++;
            apiAccess.lastUpdated = now;
            // Store updated usage
            await this.env.CELEBRUM_KV?.put(key, JSON.stringify(apiAccess), {
                expirationTtl: 86400
            });
            return {
                success: true,
                message: 'API access validated successfully',
                timestamp: now,
                data: {
                    remainingDaily: apiAccess.limits.dailyRequestLimit - apiAccess.usage.dailyRequests,
                    remainingHourly: apiAccess.limits.hourlyRequestLimit - apiAccess.usage.hourlyRequests
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to validate API access',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Validate trading request
     */
    async validateTradingRequest(userId, requestedLeverage, positionSize) {
        try {
            const key = `rbac:trading_config:${userId}`;
            const tradingConfig = await this.env.CELEBRUM_KV?.get(key, 'json');
            if (!tradingConfig) {
                return {
                    success: false,
                    message: 'Trading configuration not found',
                    timestamp: Date.now(),
                    errors: ['User trading configuration not found']
                };
            }
            const errors = [];
            // Validate leverage
            if (requestedLeverage > tradingConfig.maxLeverage) {
                errors.push(`Leverage ${requestedLeverage} exceeds maximum allowed ${tradingConfig.maxLeverage}`);
            }
            // Validate position size
            if (positionSize > tradingConfig.percentagePerTrade) {
                errors.push(`Position size ${positionSize}% exceeds maximum allowed ${tradingConfig.percentagePerTrade}%`);
            }
            // Check if trading is enabled
            if (!tradingConfig.manualTradingEnabled && !tradingConfig.autoTradingEnabled) {
                errors.push('Trading is disabled for this user');
            }
            if (errors.length > 0) {
                return {
                    success: false,
                    message: 'Trading request validation failed',
                    timestamp: Date.now(),
                    errors
                };
            }
            return {
                success: true,
                message: 'Trading request validated successfully',
                timestamp: Date.now(),
                data: {
                    maxLeverage: tradingConfig.maxLeverage,
                    maxPositionSize: tradingConfig.percentagePerTrade,
                    riskManagement: tradingConfig.riskManagement
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to validate trading request',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Register a new user with initial role and subscription tier
     */
    async registerUser(userId, role = types_1.UserRole.FREE, subscriptionTier = types_1.SubscriptionTier.FREE) {
        try {
            // Check if user already exists
            const existingUser = await this.getUserAccessSummary(userId);
            if (existingUser) {
                return {
                    success: false,
                    message: 'User already exists',
                    timestamp: Date.now(),
                    errors: ['User is already registered']
                };
            }
            // Create new user access summary
            const accessSummary = await this.createUserAccessSummary(userId, role, subscriptionTier);
            // Store user summary
            const summaryKey = `rbac:user_summary:${userId}`;
            await this.env.CELEBRUM_KV?.put(summaryKey, JSON.stringify(accessSummary), {
                expirationTtl: 86400
            });
            return {
                success: true,
                message: `User registered successfully with ${role} role and ${subscriptionTier} tier`,
                timestamp: Date.now(),
                data: accessSummary
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to register user',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Update user role and recalculate permissions
     */
    async updateUserRole(userId, newRole, newTier) {
        try {
            // Create new access summary
            const accessSummary = await this.createUserAccessSummary(userId, newRole, newTier);
            // Store updated summary
            const summaryKey = `rbac:user_summary:${userId}`;
            await this.env.CELEBRUM_KV?.put(summaryKey, JSON.stringify(accessSummary), {
                expirationTtl: 86400
            });
            return {
                success: true,
                message: `User role updated to ${newRole} with ${newTier} tier`,
                timestamp: Date.now(),
                data: accessSummary
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to update user role',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Get user access summary
     */
    async getUserAccessSummary(userId) {
        try {
            const key = `rbac:user_summary:${userId}`;
            const summary = await this.env.CELEBRUM_KV?.get(key, 'json');
            return summary;
        }
        catch (error) {
            console.error('Failed to get user access summary:', error);
            return null;
        }
    }
}
exports.RBACService = RBACService;
//# sourceMappingURL=rbac.js.map