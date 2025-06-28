"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagManager = void 0;
/**
 * Feature Flag Manager for dynamic feature control
 * Handles feature toggles, A/B testing, and role-based feature access
 */
class FeatureFlagManager {
    env;
    flagCache;
    defaultFlags;
    constructor(env) {
        this.env = env;
        this.flagCache = new Map();
        this.defaultFlags = new Map();
        this.initializeDefaultFlags();
    }
    /**
     * Get default feature flags
     */
    getDefaultFlags() {
        const result = {};
        for (const [key, value] of this.defaultFlags.entries()) {
            result[key] = value;
        }
        return result;
    }
    /**
     * Initialize default feature flags
     */
    initializeDefaultFlags() {
        const defaults = {
            // Core RBAC features
            'rbac.enabled': true,
            'rbac.strict_mode': false,
            'rbac.audit_logging': true,
            // API Access features
            'api_access.enabled': true,
            'api_access.rate_limiting': true,
            'api_access.encryption': true,
            'api_access.auto_rotation': false,
            // Trading features
            'trading.enabled': true,
            'trading.paper_trading': true,
            'trading.live_trading': false,
            'trading.risk_management': true,
            'trading.auto_execution': false,
            // Opportunity Engine features
            'opportunity_engine.enabled': true,
            'opportunity_engine.real_time': false,
            'opportunity_engine.alerts': true,
            'opportunity_engine.auto_execution': false,
            'opportunity_engine.advanced_filters': false,
            // Technical Strategy features
            'technical_strategies.enabled': true,
            'technical_strategies.backtesting': true,
            'technical_strategies.live_execution': false,
            'technical_strategies.custom_indicators': false,
            'technical_strategies.ai_optimization': false,
            // Analytics and Reporting
            'analytics.enabled': true,
            'analytics.real_time_dashboard': false,
            'analytics.advanced_metrics': false,
            'analytics.export_data': true,
            // Notifications
            'notifications.enabled': true,
            'notifications.email': true,
            'notifications.telegram': false,
            'notifications.webhook': false,
            'notifications.push': false,
            // Security features
            'security.two_factor': false,
            'security.ip_whitelist': false,
            'security.session_timeout': true,
            'security.audit_trail': true,
            // Experimental features
            'experimental.ai_assistant': false,
            'experimental.voice_commands': false,
            'experimental.mobile_app': false,
            'experimental.social_trading': false
        };
        for (const [key, value] of Object.entries(defaults)) {
            this.defaultFlags.set(key, value);
        }
    }
    /**
     * Check if a feature is enabled for a user
     */
    async isFeatureEnabled(featureKey, userId, role, subscriptionTier) {
        try {
            // Check user-specific override first (highest priority)
            if (userId) {
                const userFlag = await this.getUserFlag(userId, featureKey);
                if (userFlag !== null) {
                    return userFlag;
                }
            }
            // Get global flag value
            const globalFlag = await this.getGlobalFlag(featureKey);
            // If globally disabled, return false
            if (globalFlag === false) {
                return false;
            }
            // Check role-based access
            if (role) {
                const roleAccess = this.checkRoleAccess(featureKey, role);
                if (!roleAccess) {
                    return false;
                }
            }
            // Check subscription tier access
            if (subscriptionTier) {
                const tierAccess = this.checkTierAccess(featureKey, subscriptionTier);
                if (!tierAccess) {
                    return false;
                }
            }
            // Return global flag value or default
            return globalFlag !== null ? globalFlag : this.getDefaultFlag(featureKey);
        }
        catch (error) {
            console.error('Failed to check feature flag:', error);
            return this.getDefaultFlag(featureKey);
        }
    }
    /**
     * Set global feature flag
     */
    async setGlobalFlag(featureKey, enabled, adminUserId) {
        try {
            const flagData = {
                enabled,
                updatedBy: adminUserId,
                updatedAt: Date.now(),
                version: await this.getNextVersion(featureKey)
            };
            const key = `rbac:global_flag:${featureKey}`;
            await this.env.CELEBRUM_KV?.put(key, JSON.stringify(flagData), {
                expirationTtl: 365 * 24 * 60 * 60 // 1 year
            });
            // Update cache
            this.flagCache.set(`global:${featureKey}`, enabled);
            // Log the change
            await this.logFlagChange(featureKey, 'global', null, enabled, adminUserId);
            return {
                success: true,
                message: 'Global feature flag updated successfully',
                timestamp: Date.now(),
                data: {
                    featureKey,
                    enabled,
                    scope: 'global'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to set global feature flag',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Set user-specific feature flag override
     */
    async setUserFlag(userId, featureKey, enabled, adminUserId) {
        try {
            const flagData = {
                enabled,
                updatedBy: adminUserId,
                updatedAt: Date.now()
            };
            const key = `rbac:user_flag:${userId}:${featureKey}`;
            await this.env.CELEBRUM_KV?.put(key, JSON.stringify(flagData), {
                expirationTtl: 90 * 24 * 60 * 60 // 90 days
            });
            // Update cache
            this.flagCache.set(`user:${userId}:${featureKey}`, enabled);
            // Log the change
            await this.logFlagChange(featureKey, 'user', userId, enabled, adminUserId);
            return {
                success: true,
                message: 'User feature flag updated successfully',
                timestamp: Date.now(),
                data: {
                    featureKey,
                    userId,
                    enabled,
                    scope: 'user'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to set user feature flag',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Remove user-specific feature flag override
     */
    async removeUserFlag(userId, featureKey, adminUserId) {
        try {
            const key = `rbac:user_flag:${userId}:${featureKey}`;
            await this.env.CELEBRUM_KV?.delete(key);
            // Remove from cache
            this.flagCache.delete(`user:${userId}:${featureKey}`);
            // Log the change
            await this.logFlagChange(featureKey, 'user', userId, null, adminUserId);
            return {
                success: true,
                message: 'User feature flag override removed successfully',
                timestamp: Date.now(),
                data: {
                    featureKey,
                    userId,
                    scope: 'user'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Failed to remove user feature flag',
                timestamp: Date.now(),
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * Get all feature flags for a user
     */
    async getUserFeatureFlags(userId, role, subscriptionTier) {
        try {
            const flags = {};
            // Get all available feature keys
            const featureKeys = Array.from(this.defaultFlags.keys());
            // Check each feature
            for (const featureKey of featureKeys) {
                flags[featureKey] = await this.isFeatureEnabled(featureKey, userId, role, subscriptionTier);
            }
            return flags;
        }
        catch (error) {
            console.error('Failed to get user feature flags:', error);
            return {};
        }
    }
    /**
     * Get feature flag configuration and metadata
     */
    async getFeatureFlagConfig(featureKey) {
        try {
            const globalKey = `rbac:global_flag:${featureKey}`;
            const globalFlag = await this.env.CELEBRUM_KV?.get(globalKey, 'json');
            const config = {
                key: featureKey,
                defaultValue: this.getDefaultFlag(featureKey),
                globalValue: globalFlag?.enabled ?? null,
                globalUpdatedAt: globalFlag?.updatedAt ?? null,
                globalUpdatedBy: globalFlag?.updatedBy ?? null,
                version: globalFlag?.version ?? 1,
                roleRestrictions: this.getRoleRestrictions(featureKey),
                tierRestrictions: this.getTierRestrictions(featureKey),
                description: this.getFeatureDescription(featureKey)
            };
            return config;
        }
        catch (error) {
            console.error('Failed to get feature flag config:', error);
            return null;
        }
    }
    /**
     * Get feature flag usage statistics
     */
    async getFeatureFlagStats(featureKey) {
        try {
            const statsKey = `rbac:flag_stats:${featureKey}`;
            const stats = await this.env.CELEBRUM_KV?.get(statsKey, 'json') || {
                totalChecks: 0,
                enabledChecks: 0,
                disabledChecks: 0,
                uniqueUsers: new Set(),
                lastChecked: null
            };
            return {
                ...stats,
                uniqueUsers: Array.isArray(stats.uniqueUsers) ? stats.uniqueUsers.length : stats.uniqueUsers.size || 0,
                enabledPercentage: stats.totalChecks > 0 ? (stats.enabledChecks / stats.totalChecks) * 100 : 0
            };
        }
        catch (error) {
            console.error('Failed to get feature flag stats:', error);
            return null;
        }
    }
    /**
     * Record feature flag usage for analytics
     */
    async recordFlagUsage(featureKey, userId, enabled) {
        try {
            const statsKey = `rbac:flag_stats:${featureKey}`;
            const stats = await this.env.CELEBRUM_KV?.get(statsKey, 'json') || {
                totalChecks: 0,
                enabledChecks: 0,
                disabledChecks: 0,
                uniqueUsers: [],
                lastChecked: null
            };
            stats.totalChecks++;
            if (enabled) {
                stats.enabledChecks++;
            }
            else {
                stats.disabledChecks++;
            }
            if (!stats.uniqueUsers.includes(userId)) {
                stats.uniqueUsers.push(userId);
            }
            stats.lastChecked = Date.now();
            await this.env.CELEBRUM_KV?.put(statsKey, JSON.stringify(stats), {
                expirationTtl: 30 * 24 * 60 * 60 // 30 days
            });
        }
        catch (error) {
            console.error('Failed to record flag usage:', error);
        }
    }
    /**
     * Get global feature flag value
     */
    async getGlobalFlag(featureKey) {
        try {
            // Check cache first
            const cacheKey = `global:${featureKey}`;
            if (this.flagCache.has(cacheKey)) {
                return this.flagCache.get(cacheKey);
            }
            // Get from KV store
            const key = `rbac:global_flag:${featureKey}`;
            const flagData = await this.env.CELEBRUM_KV?.get(key, 'json');
            if (flagData) {
                this.flagCache.set(cacheKey, flagData.enabled);
                return flagData.enabled;
            }
            return null;
        }
        catch (error) {
            console.error('Failed to get global flag:', error);
            return null;
        }
    }
    /**
     * Get user-specific feature flag override
     */
    async getUserFlag(userId, featureKey) {
        try {
            // Check cache first
            const cacheKey = `user:${userId}:${featureKey}`;
            if (this.flagCache.has(cacheKey)) {
                return this.flagCache.get(cacheKey);
            }
            // Get from KV store
            const key = `rbac:user_flag:${userId}:${featureKey}`;
            const flagData = await this.env.CELEBRUM_KV?.get(key, 'json');
            if (flagData) {
                this.flagCache.set(cacheKey, flagData.enabled);
                return flagData.enabled;
            }
            return null;
        }
        catch (error) {
            console.error('Failed to get user flag:', error);
            return null;
        }
    }
    /**
     * Get default feature flag value
     */
    getDefaultFlag(featureKey) {
        return this.defaultFlags.get(featureKey) || false;
    }
    /**
     * Check role-based access to feature
     */
    checkRoleAccess(featureKey, role) {
        const roleRestrictions = {
            'trading.live_trading': ['ultra', 'admin', 'superadmin'],
            'trading.auto_execution': ['ultra', 'admin', 'superadmin'],
            'opportunity_engine.real_time': ['pro', 'ultra', 'admin', 'superadmin'],
            'opportunity_engine.auto_execution': ['ultra', 'admin', 'superadmin'],
            'opportunity_engine.advanced_filters': ['pro', 'ultra', 'admin', 'superadmin'],
            'technical_strategies.live_execution': ['ultra', 'admin', 'superadmin'],
            'technical_strategies.custom_indicators': ['pro', 'ultra', 'admin', 'superadmin'],
            'technical_strategies.ai_optimization': ['ultra', 'admin', 'superadmin'],
            'analytics.real_time_dashboard': ['pro', 'ultra', 'admin', 'superadmin'],
            'analytics.advanced_metrics': ['pro', 'ultra', 'admin', 'superadmin'],
            'notifications.telegram': ['pro', 'ultra', 'admin', 'superadmin'],
            'notifications.webhook': ['pro', 'ultra', 'admin', 'superadmin'],
            'security.two_factor': ['pro', 'ultra', 'admin', 'superadmin'],
            'security.ip_whitelist': ['ultra', 'admin', 'superadmin'],
            'experimental.ai_assistant': ['ultra', 'admin', 'superadmin'],
            'experimental.social_trading': ['pro', 'ultra', 'admin', 'superadmin']
        };
        const allowedRoles = roleRestrictions[featureKey];
        if (!allowedRoles) {
            return true; // No restrictions
        }
        return allowedRoles.includes(role);
    }
    /**
     * Check subscription tier access to feature
     */
    checkTierAccess(featureKey, tier) {
        const tierRestrictions = {
            'opportunity_engine.real_time': ['pro', 'ultra', 'enterprise'],
            'opportunity_engine.advanced_filters': ['pro', 'ultra', 'enterprise'],
            'technical_strategies.custom_indicators': ['pro', 'ultra', 'enterprise'],
            'technical_strategies.ai_optimization': ['ultra', 'enterprise'],
            'analytics.real_time_dashboard': ['pro', 'ultra', 'enterprise'],
            'analytics.advanced_metrics': ['pro', 'ultra', 'enterprise'],
            'notifications.telegram': ['pro', 'ultra', 'enterprise'],
            'notifications.webhook': ['pro', 'ultra', 'enterprise'],
            'security.two_factor': ['pro', 'ultra', 'enterprise'],
            'security.ip_whitelist': ['ultra', 'enterprise'],
            'experimental.ai_assistant': ['ultra', 'enterprise']
        };
        const allowedTiers = tierRestrictions[featureKey];
        if (!allowedTiers) {
            return true; // No restrictions
        }
        return allowedTiers.includes(tier);
    }
    /**
     * Get role restrictions for a feature
     */
    getRoleRestrictions(_featureKey) {
        // Extract role restrictions from the method - simplified for demo
        return null;
    }
    /**
     * Get tier restrictions for a feature
     */
    getTierRestrictions(_featureKey) {
        // Extract tier restrictions from the method - simplified for demo
        return null;
    }
    /**
     * Get feature description
     */
    getFeatureDescription(featureKey) {
        const descriptions = {
            'rbac.enabled': 'Enable role-based access control system',
            'rbac.strict_mode': 'Enforce strict permission checking',
            'api_access.enabled': 'Enable API access management',
            'trading.enabled': 'Enable trading functionality',
            'trading.live_trading': 'Enable live trading with real money',
            'opportunity_engine.enabled': 'Enable arbitrage opportunity detection',
            'technical_strategies.enabled': 'Enable technical strategy system',
            'analytics.enabled': 'Enable analytics and reporting',
            'notifications.enabled': 'Enable notification system'
        };
        return descriptions[featureKey] || 'No description available';
    }
    /**
     * Get next version number for feature flag
     */
    async getNextVersion(featureKey) {
        try {
            const versionKey = `rbac:flag_version:${featureKey}`;
            const currentVersion = await this.env.CELEBRUM_KV?.get(versionKey) || '0';
            const nextVersion = parseInt(currentVersion) + 1;
            await this.env.CELEBRUM_KV?.put(versionKey, nextVersion.toString(), {
                expirationTtl: 365 * 24 * 60 * 60
            });
            return nextVersion;
        }
        catch (error) {
            console.error('Failed to get next version:', error);
            return 1;
        }
    }
    /**
     * Log feature flag changes for audit trail
     */
    async logFlagChange(featureKey, scope, targetUserId, enabled, adminUserId) {
        try {
            const logEntry = {
                featureKey,
                scope,
                targetUserId,
                enabled,
                adminUserId,
                timestamp: Date.now(),
                action: enabled === null ? 'removed' : (enabled ? 'enabled' : 'disabled')
            };
            const logKey = `rbac:flag_log:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await this.env.CELEBRUM_KV?.put(logKey, JSON.stringify(logEntry), {
                expirationTtl: 90 * 24 * 60 * 60 // 90 days
            });
        }
        catch (error) {
            console.error('Failed to log flag change:', error);
        }
    }
}
exports.FeatureFlagManager = FeatureFlagManager;
//# sourceMappingURL=feature-flag-manager.js.map