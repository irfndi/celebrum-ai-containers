"use strict";
/**
 * Type definitions for the Celebrum AI platform
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = exports.ArbEdgeError = exports.ServiceStatus = exports.RBACOperationResultSchema = exports.TechnicalStrategySchema = exports.UserAccessSummarySchema = exports.TierLimitsSchema = exports.StrategyLimitsSchema = exports.OpportunityLimitsSchema = exports.ApiAccessSchema = exports.TradingConfigSchema = exports.RiskManagementConfigSchema = exports.ArbitrageOpportunitySchema = exports.OpportunitySchema = exports.PositionSchema = exports.OpportunityType = exports.TradingStrategyType = exports.PositionStatus = exports.PositionType = exports.ExchangeId = exports.UserSchema = exports.PositionSizingMethod = exports.RiskLevel = exports.Permission = exports.SubscriptionTier = exports.UserStatus = exports.UserRole = void 0;
// @celebrum-ai/shared - Shared Types
const zod_1 = require("zod");
// API types
__exportStar(require("./api"), exports);
// Market data types
__exportStar(require("./market"), exports);
// User types
__exportStar(require("./user"), exports);
// Notification types
__exportStar(require("./notifications"), exports);
// User Role and Status Enums
exports.UserRole = {
    FREE: 'free',
    PRO: 'pro',
    ULTRA: 'ultra',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
};
exports.UserStatus = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    BANNED: 'banned'
};
exports.SubscriptionTier = {
    FREE: 'free',
    PRO: 'pro',
    ULTRA: 'ultra',
    ENTERPRISE: 'enterprise'
};
// RBAC Permission Types
exports.Permission = {
    // Basic permissions
    READ_PROFILE: 'read:profile',
    UPDATE_PROFILE: 'update:profile',
    // Trading permissions
    TRADE_MANUAL: 'trade:manual',
    TRADE_AUTO: 'trade:auto',
    TRADE_VIEW_POSITIONS: 'trade:view_positions',
    TRADE_MANAGE_CONFIG: 'trade:manage_config',
    // API permissions
    API_EXCHANGE_ACCESS: 'api:exchange_access',
    API_AI_ACCESS: 'api:ai_access',
    API_MANAGE_KEYS: 'api:manage_keys',
    // Opportunity permissions
    OPPORTUNITY_VIEW: 'opportunity:view',
    OPPORTUNITY_EXECUTE: 'opportunity:execute',
    OPPORTUNITY_CREATE_ALERTS: 'opportunity:create_alerts',
    // Strategy permissions
    STRATEGY_VIEW: 'strategy:view',
    STRATEGY_CREATE: 'strategy:create',
    STRATEGY_EXECUTE: 'strategy:execute',
    STRATEGY_BACKTEST: 'strategy:backtest',
    // Admin permissions
    ADMIN_USER_MANAGEMENT: 'admin:user_management',
    ADMIN_SYSTEM_CONFIG: 'admin:system_config',
    ADMIN_VIEW_ANALYTICS: 'admin:view_analytics',
    ADMIN_MANAGE_FEATURES: 'admin:manage_features',
    // Super admin permissions
    SUPERADMIN_FULL_ACCESS: 'superadmin:full_access'
};
// Risk Management Types
exports.RiskLevel = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};
exports.PositionSizingMethod = {
    FIXED_AMOUNT: 'fixed_amount',
    PERCENTAGE_OF_PORTFOLIO: 'percentage_of_portfolio',
    KELLY_FORMULA: 'kelly_formula',
    VOLATILITY_BASED: 'volatility_based',
    RISK_PARITY: 'risk_parity'
};
// User Types
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.number(),
    telegramId: zod_1.z.string(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    username: zod_1.z.string().optional(),
    languageCode: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    role: zod_1.z.enum(['free', 'pro', 'ultra', 'admin', 'superadmin']).default('free'),
    status: zod_1.z.enum(['active', 'suspended', 'banned']).default('active'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    lastActiveAt: zod_1.z.date().optional(),
    settings: zod_1.z.object({
        notifications: zod_1.z.boolean().optional(),
        theme: zod_1.z.enum(['light', 'dark']).optional(),
        language: zod_1.z.string().optional(),
        timezone: zod_1.z.string().optional(),
    }).optional(),
    apiLimits: zod_1.z.object({
        exchangeApis: zod_1.z.number().optional(),
        aiApis: zod_1.z.number().optional(),
        maxDailyRequests: zod_1.z.number().optional(),
    }).optional(),
    accountBalance: zod_1.z.string().default('0.00'),
    betaExpiresAt: zod_1.z.date().optional(),
    tradingPreferences: zod_1.z.object({
        percentagePerTrade: zod_1.z.number().optional(),
        maxConcurrentTrades: zod_1.z.number().optional(),
        maxLeverage: zod_1.z.number().optional(),
        stopLoss: zod_1.z.number().optional(),
        takeProfit: zod_1.z.number().optional(),
        riskTolerance: zod_1.z.enum(['low', 'medium', 'high']).optional(),
        autoTrade: zod_1.z.boolean().optional(),
    }).optional(),
});
// Exchange Types
exports.ExchangeId = {
    BINANCE: 'binance',
    BYBIT: 'bybit',
    OKX: 'okx',
    BITGET: 'bitget',
    KUCOIN: 'kucoin',
    GATE: 'gate',
    MEXC: 'mexc',
    HUOBI: 'huobi',
    KRAKEN: 'kraken',
    COINBASE: 'coinbase'
};
// Trading Types
exports.PositionType = {
    LONG: 'long',
    SHORT: 'short'
};
exports.PositionStatus = {
    OPEN: 'open',
    CLOSED: 'closed',
    PARTIALLY_FILLED: 'partially_filled',
    CANCELLED: 'cancelled'
};
exports.TradingStrategyType = {
    ARBITRAGE: 'arbitrage',
    TECHNICAL: 'technical',
    MANUAL: 'manual'
};
exports.OpportunityType = {
    ARBITRAGE: 'arbitrage',
    TECHNICAL: 'technical'
};
// Position Schema
exports.PositionSchema = zod_1.z.object({
    id: zod_1.z.number(),
    userId: zod_1.z.number(),
    exchangeId: zod_1.z.string(),
    symbol: zod_1.z.string(),
    type: zod_1.z.enum(['long', 'short']),
    strategy: zod_1.z.enum(['arbitrage', 'technical', 'manual']),
    entryPrice: zod_1.z.number(),
    exitPrice: zod_1.z.number().optional(),
    quantity: zod_1.z.number(),
    leverage: zod_1.z.number().default(1),
    stopLoss: zod_1.z.number().optional(),
    takeProfit: zod_1.z.number().optional(),
    status: zod_1.z.enum(['open', 'closed', 'partially_filled', 'cancelled']).default('open'),
    pnl: zod_1.z.number().default(0),
    fees: zod_1.z.number().default(0),
    metadata: zod_1.z.object({
        fundingRate: zod_1.z.number().optional(),
        correlatedPositions: zod_1.z.array(zod_1.z.string()).optional(),
        riskScore: zod_1.z.number().optional(),
        autoClose: zod_1.z.boolean().optional(),
    }).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    closedAt: zod_1.z.date().optional(),
});
// Opportunity Schema
exports.OpportunitySchema = zod_1.z.object({
    id: zod_1.z.number(),
    type: zod_1.z.enum(['arbitrage', 'technical']),
    symbol: zod_1.z.string(),
    exchange1: zod_1.z.string(),
    exchange2: zod_1.z.string(),
    price1: zod_1.z.number(),
    price2: zod_1.z.number(),
    profitPercentage: zod_1.z.number(),
    confidence: zod_1.z.number(),
    expiresAt: zod_1.z.date(),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
});
// Legacy ArbitrageOpportunity for backward compatibility
exports.ArbitrageOpportunitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    symbol: zod_1.z.string(),
    exchange_a: zod_1.z.string(),
    exchange_b: zod_1.z.string(),
    price_a: zod_1.z.number(),
    price_b: zod_1.z.number(),
    profit_percentage: zod_1.z.number(),
    confidence_score: zod_1.z.number(),
    generated_at: zod_1.z.string(),
    expires_at: zod_1.z.string(),
});
// RBAC and Trading Configuration Types
exports.RiskManagementConfigSchema = zod_1.z.object({
    maxDailyLossPercent: zod_1.z.number().min(0).max(100),
    maxDrawdownPercent: zod_1.z.number().min(0).max(100),
    positionSizingMethod: zod_1.z.enum(['fixed_amount', 'percentage_of_portfolio', 'kelly_formula', 'volatility_based', 'risk_parity']),
    stopLossRequired: zod_1.z.boolean(),
    takeProfitRecommended: zod_1.z.boolean(),
    trailingStopEnabled: zod_1.z.boolean(),
    riskRewardRatioMin: zod_1.z.number().min(0),
});
exports.TradingConfigSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    role: zod_1.z.enum(['free', 'pro', 'ultra', 'admin', 'superadmin']),
    percentagePerTrade: zod_1.z.number().min(0).max(100),
    maxConcurrentTrades: zod_1.z.number().min(1).max(50),
    maxLeverage: zod_1.z.number().min(1).max(100),
    stopLoss: zod_1.z.number().optional(),
    takeProfit: zod_1.z.number().optional(),
    riskTolerance: zod_1.z.enum(['low', 'medium', 'high']),
    autoTradingEnabled: zod_1.z.boolean(),
    manualTradingEnabled: zod_1.z.boolean(),
    riskManagement: exports.RiskManagementConfigSchema,
    lastUpdated: zod_1.z.number(),
});
exports.ApiAccessSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    role: zod_1.z.enum(['free', 'pro', 'ultra', 'admin', 'superadmin']),
    exchangeApis: zod_1.z.array(zod_1.z.object({
        exchangeId: zod_1.z.string(),
        apiKey: zod_1.z.string(),
        secretKey: zod_1.z.string(),
        passphrase: zod_1.z.string().optional(),
        sandbox: zod_1.z.boolean().default(false),
        permissions: zod_1.z.array(zod_1.z.string()),
        isActive: zod_1.z.boolean().default(true),
        lastUsed: zod_1.z.number().optional(),
    })),
    aiApis: zod_1.z.array(zod_1.z.object({
        provider: zod_1.z.string(),
        apiKey: zod_1.z.string(),
        model: zod_1.z.string().optional(),
        maxTokens: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().default(true),
        lastUsed: zod_1.z.number().optional(),
    })),
    limits: zod_1.z.object({
        maxExchangeApis: zod_1.z.number(),
        maxAiApis: zod_1.z.number(),
        dailyRequestLimit: zod_1.z.number(),
        hourlyRequestLimit: zod_1.z.number(),
    }),
    usage: zod_1.z.object({
        dailyRequests: zod_1.z.number().default(0),
        hourlyRequests: zod_1.z.number().default(0),
        totalRequests: zod_1.z.number().default(0),
        lastReset: zod_1.z.number(),
    }),
    lastUpdated: zod_1.z.number(),
});
exports.OpportunityLimitsSchema = zod_1.z.object({
    dailyLimit: zod_1.z.number(),
    dailyUsed: zod_1.z.number(),
    hourlyLimit: zod_1.z.number(),
    hourlyUsed: zod_1.z.number(),
    totalAccessed: zod_1.z.number(),
    successRate: zod_1.z.number().min(0).max(1),
});
exports.StrategyLimitsSchema = zod_1.z.object({
    maxStrategies: zod_1.z.number(),
    createdStrategies: zod_1.z.number(),
    maxActiveStrategies: zod_1.z.number(),
    activeStrategies: zod_1.z.number(),
    maxConcurrentBacktests: zod_1.z.number(),
    concurrentBacktests: zod_1.z.number(),
});
exports.TierLimitsSchema = zod_1.z.object({
    maxExchangeApis: zod_1.z.number(),
    maxAiApis: zod_1.z.number(),
    dailyRequestLimit: zod_1.z.number(),
    hourlyRequestLimit: zod_1.z.number(),
    maxConcurrentTrades: zod_1.z.number(),
    maxLeverage: zod_1.z.number(),
    maxStrategies: zod_1.z.number(),
    maxActiveStrategies: zod_1.z.number(),
    maxConcurrentBacktests: zod_1.z.number(),
    dailyOpportunityLimit: zod_1.z.number(),
    hourlyOpportunityLimit: zod_1.z.number(),
});
exports.UserAccessSummarySchema = zod_1.z.object({
    userId: zod_1.z.string(),
    role: zod_1.z.enum(['free', 'pro', 'ultra', 'admin', 'superadmin']),
    subscriptionTier: zod_1.z.enum(['free', 'pro', 'ultra', 'enterprise']),
    permissions: zod_1.z.array(zod_1.z.string()),
    apiAccess: exports.ApiAccessSchema,
    tradingConfig: exports.TradingConfigSchema.optional(),
    opportunityLimits: exports.OpportunityLimitsSchema,
    strategyLimits: exports.StrategyLimitsSchema,
    featureFlags: zod_1.z.record(zod_1.z.boolean()),
    lastUpdated: zod_1.z.number(),
});
exports.TechnicalStrategySchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string(),
    yamlConfig: zod_1.z.string(), // YAML strategy configuration
    isActive: zod_1.z.boolean().default(false),
    indicators: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        parameters: zod_1.z.record(zod_1.z.unknown()),
        timeframe: zod_1.z.string(),
    })),
    conditions: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['entry', 'exit', 'stop_loss', 'take_profit']),
        logic: zod_1.z.string(),
        parameters: zod_1.z.record(zod_1.z.unknown()),
    })),
    riskManagement: exports.RiskManagementConfigSchema,
    backtestResults: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
        totalReturn: zod_1.z.number(),
        sharpeRatio: zod_1.z.number(),
        maxDrawdown: zod_1.z.number(),
        winRate: zod_1.z.number(),
        totalTrades: zod_1.z.number(),
        createdAt: zod_1.z.number(),
    })).optional(),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
});
exports.RBACOperationResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    data: zod_1.z.unknown().optional(),
    timestamp: zod_1.z.number(),
    errors: zod_1.z.array(zod_1.z.string()).optional(),
});
// Service Status Types
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["HEALTHY"] = "healthy";
    ServiceStatus["DEGRADED"] = "degraded";
    ServiceStatus["UNHEALTHY"] = "unhealthy";
    ServiceStatus["UNKNOWN"] = "unknown";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
// Error Types
class ArbEdgeError extends Error {
    code;
    status;
    details;
    constructor(message, code, status = 500, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'ArbEdgeError';
    }
}
exports.ArbEdgeError = ArbEdgeError;
// Export all schemas for validation
exports.Schemas = {
    User: exports.UserSchema,
    ArbitrageOpportunity: exports.ArbitrageOpportunitySchema,
};
//# sourceMappingURL=index.js.map