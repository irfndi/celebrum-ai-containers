/**
 * Feature Flag Utilities
 * Provides helper functions and decorators for feature flag usage
 */
import type { UserRoleType, SubscriptionTierType } from '../types';
/**
 * Feature flag context for current user
 */
export interface FeatureFlagContext {
    userId?: string;
    role?: UserRoleType;
    subscriptionTier?: SubscriptionTierType;
}
/**
 * Feature flag check result
 */
export interface FeatureFlagResult {
    enabled: boolean;
    reason?: string;
}
/**
 * Utility class for feature flag operations
 */
export declare class FeatureFlagUtils {
    private static service;
    /**
     * Initialize the feature flag service
     */
    static initialize(_env: unknown): void;
    /**
     * Get the feature flag service instance
     */
    private static getService;
    /**
     * Check if a feature is enabled
     */
    static isEnabled(featureKey: string, context?: FeatureFlagContext): Promise<boolean>;
    /**
     * Check if a feature is enabled with detailed result
     */
    static checkFeature(featureKey: string, context?: FeatureFlagContext): Promise<FeatureFlagResult>;
    /**
     * Check multiple features at once
     */
    static checkFeatures(featureKeys: string[], context?: FeatureFlagContext): Promise<Record<string, FeatureFlagResult>>;
    /**
     * Get all enabled features for a user
     */
    static getEnabledFeatures(context: Required<FeatureFlagContext>): Promise<string[]>;
    /**
     * Get feature flag description
     */
    static getDescription(featureKey: string): string | null;
    /**
     * Validate if a feature flag exists
     */
    static isValidFeature(featureKey: string): boolean;
    /**
     * Get all available feature flags
     */
    static getAvailableFeatures(): string[];
}
/**
 * Decorator for methods that require a feature flag
 */
export declare function RequireFeature(featureKey: string): (target: unknown, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Decorator for classes that require feature flags
 */
export declare function RequireFeatures(featureKeys: string[]): <T extends {
    new (...args: any[]): object;
}>(constructor: T) => {
    new (...args: any[]): {
        checkRequiredFeatures(context?: FeatureFlagContext): Promise<void>;
    };
} & T;
/**
 * Feature flag conditional execution
 */
export declare class FeatureFlagConditional {
    /**
     * Execute function only if feature is enabled
     */
    static ifEnabled<T>(featureKey: string, fn: () => T | Promise<T>, context?: FeatureFlagContext): Promise<T | null>;
    /**
     * Execute different functions based on feature flag status
     */
    static ifEnabledElse<T>(featureKey: string, enabledFn: () => T | Promise<T>, disabledFn: () => T | Promise<T>, context?: FeatureFlagContext): Promise<T>;
    /**
     * Execute function with feature flag variants (A/B testing)
     */
    static withVariant<T>(baseFeatureKey: string, variants: Record<string, () => T | Promise<T>>, defaultFn: () => T | Promise<T>, context?: FeatureFlagContext): Promise<T>;
}
/**
 * Feature flag cache for performance optimization
 */
export declare class FeatureFlagCache {
    private static cache;
    private static readonly DEFAULT_TTL;
    /**
     * Get cached feature flag value
     */
    static getCached(featureKey: string, context?: FeatureFlagContext, ttl?: number): Promise<boolean>;
    /**
     * Clear cache for a specific feature or all features
     */
    static clearCache(featureKey?: string): void;
    /**
     * Generate cache key
     */
    private static getCacheKey;
    /**
     * Clean expired entries
     */
    static cleanExpired(): void;
}
/**
 * Feature flag constants for commonly used features
 */
export declare const FEATURE_FLAGS: {
    readonly RBAC_ENABLED: "rbac.enabled";
    readonly RBAC_STRICT_MODE: "rbac.strict_mode";
    readonly TRADING_ENABLED: "trading.enabled";
    readonly TRADING_LIVE: "trading.live_trading";
    readonly TRADING_AUTO_EXECUTION: "trading.auto_execution";
    readonly OPPORTUNITY_ENGINE_ENABLED: "opportunity_engine.enabled";
    readonly OPPORTUNITY_ENGINE_REAL_TIME: "opportunity_engine.real_time";
    readonly OPPORTUNITY_ENGINE_AUTO_EXECUTION: "opportunity_engine.auto_execution";
    readonly ANALYTICS_ENABLED: "analytics.enabled";
    readonly ANALYTICS_REAL_TIME: "analytics.real_time_dashboard";
    readonly ANALYTICS_ADVANCED: "analytics.advanced_metrics";
    readonly NOTIFICATIONS_ENABLED: "notifications.enabled";
    readonly NOTIFICATIONS_TELEGRAM: "notifications.telegram";
    readonly NOTIFICATIONS_WEBHOOK: "notifications.webhook";
    readonly SECURITY_TWO_FACTOR: "security.two_factor";
    readonly SECURITY_IP_WHITELIST: "security.ip_whitelist";
    readonly EXPERIMENTAL_AI_ASSISTANT: "experimental.ai_assistant";
    readonly EXPERIMENTAL_SOCIAL_TRADING: "experimental.social_trading";
};
/**
 * Type for feature flag keys
 */
export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];
//# sourceMappingURL=feature-flags.d.ts.map