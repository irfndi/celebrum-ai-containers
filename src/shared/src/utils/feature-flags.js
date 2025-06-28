"use strict";
/**
 * Feature Flag Utilities
 * Provides helper functions and decorators for feature flag usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_FLAGS = exports.FeatureFlagCache = exports.FeatureFlagConditional = exports.FeatureFlagUtils = void 0;
exports.RequireFeature = RequireFeature;
exports.RequireFeatures = RequireFeatures;
const feature_flag_service_1 = require("../services/feature-flag-service");
/**
 * Utility class for feature flag operations
 */
class FeatureFlagUtils {
    static service = null;
    /**
     * Initialize the feature flag service
     */
    static initialize(_env) {
        // Service will be created via the singleton pattern
        this.service = (0, feature_flag_service_1.getFeatureFlagService)();
    }
    /**
     * Get the feature flag service instance
     */
    static getService() {
        if (!this.service) {
            throw new Error('FeatureFlagUtils not initialized. Call initialize() first.');
        }
        return this.service;
    }
    /**
     * Check if a feature is enabled
     */
    static async isEnabled(featureKey, context) {
        try {
            const service = this.getService();
            return await service.isFeatureEnabled(featureKey, context?.userId, context?.role, context?.subscriptionTier);
        }
        catch (error) {
            console.error(`Error checking feature flag ${featureKey}:`, error);
            return false;
        }
    }
    /**
     * Check if a feature is enabled with detailed result
     */
    static async checkFeature(featureKey, context) {
        try {
            const service = this.getService();
            if (!service.isValidFeatureFlag(featureKey)) {
                return {
                    enabled: false,
                    reason: `Invalid feature flag: ${featureKey}`
                };
            }
            const enabled = await service.isFeatureEnabled(featureKey, context?.userId, context?.role, context?.subscriptionTier);
            return {
                enabled,
                reason: enabled ? undefined : `Feature '${featureKey}' is disabled`
            };
        }
        catch (error) {
            return {
                enabled: false,
                reason: `Error checking feature flag: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Check multiple features at once
     */
    static async checkFeatures(featureKeys, context) {
        const results = {};
        for (const featureKey of featureKeys) {
            results[featureKey] = await this.checkFeature(featureKey, context);
        }
        return results;
    }
    /**
     * Get all enabled features for a user
     */
    static async getEnabledFeatures(context) {
        try {
            const service = this.getService();
            const allFlags = await service.getUserFeatureFlags(context.userId, context.role, context.subscriptionTier);
            return Object.entries(allFlags)
                .filter(([, enabled]) => enabled)
                .map(([featureKey]) => featureKey);
        }
        catch (error) {
            console.error('Error getting enabled features:', error);
            return [];
        }
    }
    /**
     * Get feature flag description
     */
    static getDescription(featureKey) {
        try {
            const service = this.getService();
            return service.getFeatureDescription(featureKey);
        }
        catch (error) {
            console.error(`Error getting description for ${featureKey}:`, error);
            return null;
        }
    }
    /**
     * Validate if a feature flag exists
     */
    static isValidFeature(featureKey) {
        try {
            const service = this.getService();
            return service.isValidFeatureFlag(featureKey);
        }
        catch (error) {
            console.error(`Error validating feature ${featureKey}:`, error);
            return false;
        }
    }
    /**
     * Get all available feature flags
     */
    static getAvailableFeatures() {
        try {
            const service = this.getService();
            return service.getAvailableFlags();
        }
        catch (error) {
            console.error('Error getting available features:', error);
            return [];
        }
    }
}
exports.FeatureFlagUtils = FeatureFlagUtils;
/**
 * Decorator for methods that require a feature flag
 */
function RequireFeature(featureKey) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            // Extract context from arguments or instance
            const context = this?.getFeatureFlagContext?.() || {};
            const result = await FeatureFlagUtils.checkFeature(featureKey, context);
            if (!result.enabled) {
                throw new Error(`Feature '${featureKey}' is not enabled: ${result.reason}`);
            }
            return method.apply(this, args);
        };
        return descriptor;
    };
}
/**
 * Decorator for classes that require feature flags
 */
function RequireFeatures(featureKeys) {
    return function (constructor) {
        return class extends constructor {
            constructor(...args) {
                super(...args);
            }
            async checkRequiredFeatures(context) {
                const results = await FeatureFlagUtils.checkFeatures(featureKeys, context);
                const disabledFeatures = Object.entries(results)
                    .filter(([, result]) => !result.enabled)
                    .map(([featureKey, result]) => `${featureKey}: ${result.reason}`);
                if (disabledFeatures.length > 0) {
                    throw new Error(`Required features not enabled: ${disabledFeatures.join(', ')}`);
                }
            }
        };
    };
}
/**
 * Feature flag conditional execution
 */
class FeatureFlagConditional {
    /**
     * Execute function only if feature is enabled
     */
    static async ifEnabled(featureKey, fn, context) {
        const enabled = await FeatureFlagUtils.isEnabled(featureKey, context);
        if (enabled) {
            return await fn();
        }
        return null;
    }
    /**
     * Execute different functions based on feature flag status
     */
    static async ifEnabledElse(featureKey, enabledFn, disabledFn, context) {
        const enabled = await FeatureFlagUtils.isEnabled(featureKey, context);
        if (enabled) {
            return await enabledFn();
        }
        else {
            return await disabledFn();
        }
    }
    /**
     * Execute function with feature flag variants (A/B testing)
     */
    static async withVariant(baseFeatureKey, variants, defaultFn, context) {
        // Check which variant is enabled
        for (const [variant, fn] of Object.entries(variants)) {
            const variantKey = `${baseFeatureKey}.${variant}`;
            const enabled = await FeatureFlagUtils.isEnabled(variantKey, context);
            if (enabled) {
                return await fn();
            }
        }
        // Fall back to default
        return await defaultFn();
    }
}
exports.FeatureFlagConditional = FeatureFlagConditional;
/**
 * Feature flag cache for performance optimization
 */
class FeatureFlagCache {
    static cache = new Map();
    static DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    /**
     * Get cached feature flag value
     */
    static async getCached(featureKey, context, ttl = this.DEFAULT_TTL) {
        const cacheKey = this.getCacheKey(featureKey, context);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            return cached.value;
        }
        // Fetch fresh value
        const value = await FeatureFlagUtils.isEnabled(featureKey, context);
        // Cache it
        this.cache.set(cacheKey, {
            value,
            expiry: Date.now() + ttl
        });
        return value;
    }
    /**
     * Clear cache for a specific feature or all features
     */
    static clearCache(featureKey) {
        if (featureKey) {
            // Clear all entries for this feature
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${featureKey}:`)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            // Clear all cache
            this.cache.clear();
        }
    }
    /**
     * Generate cache key
     */
    static getCacheKey(featureKey, context) {
        const parts = [featureKey];
        if (context?.userId)
            parts.push(`user:${context.userId}`);
        if (context?.role)
            parts.push(`role:${context.role}`);
        if (context?.subscriptionTier)
            parts.push(`tier:${context.subscriptionTier}`);
        return parts.join(':');
    }
    /**
     * Clean expired entries
     */
    static cleanExpired() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.expiry <= now) {
                this.cache.delete(key);
            }
        }
    }
}
exports.FeatureFlagCache = FeatureFlagCache;
/**
 * Feature flag constants for commonly used features
 */
exports.FEATURE_FLAGS = {
    // Core features
    RBAC_ENABLED: 'rbac.enabled',
    RBAC_STRICT_MODE: 'rbac.strict_mode',
    // Trading features
    TRADING_ENABLED: 'trading.enabled',
    TRADING_LIVE: 'trading.live_trading',
    TRADING_AUTO_EXECUTION: 'trading.auto_execution',
    // Opportunity engine
    OPPORTUNITY_ENGINE_ENABLED: 'opportunity_engine.enabled',
    OPPORTUNITY_ENGINE_REAL_TIME: 'opportunity_engine.real_time',
    OPPORTUNITY_ENGINE_AUTO_EXECUTION: 'opportunity_engine.auto_execution',
    // Analytics
    ANALYTICS_ENABLED: 'analytics.enabled',
    ANALYTICS_REAL_TIME: 'analytics.real_time_dashboard',
    ANALYTICS_ADVANCED: 'analytics.advanced_metrics',
    // Notifications
    NOTIFICATIONS_ENABLED: 'notifications.enabled',
    NOTIFICATIONS_TELEGRAM: 'notifications.telegram',
    NOTIFICATIONS_WEBHOOK: 'notifications.webhook',
    // Security
    SECURITY_TWO_FACTOR: 'security.two_factor',
    SECURITY_IP_WHITELIST: 'security.ip_whitelist',
    // Experimental
    EXPERIMENTAL_AI_ASSISTANT: 'experimental.ai_assistant',
    EXPERIMENTAL_SOCIAL_TRADING: 'experimental.social_trading'
};
//# sourceMappingURL=feature-flags.js.map