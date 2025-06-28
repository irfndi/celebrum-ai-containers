"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
exports.createFeatureFlagService = createFeatureFlagService;
exports.getFeatureFlagService = getFeatureFlagService;
const feature_flag_manager_1 = require("../config/feature-flag-manager");
const config_1 = require("../config");
/**
 * Enhanced Feature Flag Service
 * Integrates FeatureFlagManager with feature_flags.json configuration
 * Provides centralized feature flag management with JSON-based defaults
 */
class FeatureFlagService {
    manager;
    jsonFlags;
    constructor(env) {
        this.manager = new feature_flag_manager_1.FeatureFlagManager(env);
        this.jsonFlags = config_1.FEATURE_FLAGS_CONFIG;
        this.initializeFromJson();
    }
    /**
     * Initialize feature flags from JSON configuration
     */
    initializeFromJson() {
        // The FeatureFlagManager already has its own defaults
        // This method can be used to sync with JSON if needed
        console.log('FeatureFlagService initialized with JSON configuration');
    }
    /**
     * Check if a feature is enabled for a user
     * First checks the dynamic FeatureFlagManager, then falls back to JSON config
     */
    async isFeatureEnabled(featureKey, userId, role, subscriptionTier) {
        try {
            // First check the dynamic feature flag manager
            const dynamicResult = await this.manager.isFeatureEnabled(featureKey, userId, role, subscriptionTier);
            // If dynamic manager has a result, use it
            if (dynamicResult !== null) {
                return dynamicResult;
            }
            // Fall back to JSON configuration
            return this.getJsonFeatureFlag(featureKey, role, subscriptionTier);
        }
        catch (error) {
            console.error('Error checking feature flag:', error);
            // Final fallback to JSON
            return this.getJsonFeatureFlag(featureKey, role, subscriptionTier);
        }
    }
    /**
     * Get feature flag value from JSON configuration
     */
    getJsonFeatureFlag(featureKey, role, subscriptionTier) {
        const parts = featureKey.split('.');
        let current = this.jsonFlags;
        // Navigate through the nested JSON structure
        for (const part of parts) {
            if (current && typeof current === 'object' && current !== null && part in current) {
                current = current[part];
            }
            else {
                return false; // Feature not found in JSON
            }
        }
        // If it's a boolean, return it directly
        if (typeof current === 'boolean') {
            return current;
        }
        // If it's an object with 'enabled' property
        if (current && typeof current === 'object' && 'enabled' in current) {
            const enabled = current.enabled;
            // Check role restrictions if present
            const currentWithRoles = current;
            if (currentWithRoles.roles && role) {
                if (Array.isArray(currentWithRoles.roles) && !currentWithRoles.roles.includes(role)) {
                    return false;
                }
            }
            // Check subscription tier restrictions if present
            const currentConfig = current;
            if (currentConfig.subscription_tiers && subscriptionTier) {
                if (Array.isArray(currentConfig.subscription_tiers) && !currentConfig.subscription_tiers.includes(subscriptionTier)) {
                    return false;
                }
            }
            return Boolean(enabled);
        }
        return false;
    }
    /**
     * Set global feature flag (delegates to FeatureFlagManager)
     */
    async setGlobalFlag(featureKey, enabled, adminUserId) {
        return this.manager.setGlobalFlag(featureKey, enabled, adminUserId);
    }
    /**
     * Set user-specific feature flag override (delegates to FeatureFlagManager)
     */
    async setUserFlag(userId, featureKey, enabled, adminUserId) {
        return this.manager.setUserFlag(userId, featureKey, enabled, adminUserId);
    }
    /**
     * Remove user-specific feature flag override (delegates to FeatureFlagManager)
     */
    async removeUserFlag(userId, featureKey, adminUserId) {
        return this.manager.removeUserFlag(userId, featureKey, adminUserId);
    }
    /**
     * Get all feature flags for a user
     * Combines dynamic flags with JSON configuration
     */
    async getUserFeatureFlags(userId, role, subscriptionTier) {
        try {
            // Get dynamic flags from manager
            const dynamicFlags = await this.manager.getUserFeatureFlags(userId, role, subscriptionTier);
            // Get all available flags from JSON
            const jsonFlags = this.getAllJsonFlags(role, subscriptionTier);
            // Merge them (dynamic flags take precedence)
            return { ...jsonFlags, ...dynamicFlags };
        }
        catch (error) {
            console.error('Error getting user feature flags:', error);
            return this.getAllJsonFlags(role, subscriptionTier);
        }
    }
    /**
     * Get all feature flags from JSON configuration
     */
    getAllJsonFlags(role, subscriptionTier) {
        const flags = {};
        const extractFlags = (obj, prefix = '') => {
            if (typeof obj !== 'object' || obj === null)
                return;
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'boolean') {
                    flags[fullKey] = value;
                }
                else if (value && typeof value === 'object') {
                    if ('enabled' in value) {
                        // Check restrictions
                        let allowed = true;
                        const flagConfig = value;
                        if (flagConfig.roles && role) {
                            allowed = allowed && Array.isArray(flagConfig.roles) && flagConfig.roles.includes(role);
                        }
                        if (flagConfig.subscription_tiers && subscriptionTier) {
                            allowed = allowed && Array.isArray(flagConfig.subscription_tiers) && flagConfig.subscription_tiers.includes(subscriptionTier);
                        }
                        flags[fullKey] = allowed && Boolean(flagConfig.enabled);
                    }
                    else {
                        // Recursively extract nested flags
                        extractFlags(value, fullKey);
                    }
                }
            }
        };
        extractFlags(this.jsonFlags);
        return flags;
    }
    /**
     * Get feature flag configuration and metadata (delegates to FeatureFlagManager)
     */
    async getFeatureFlagConfig(featureKey) {
        return this.manager.getFeatureFlagConfig(featureKey);
    }
    /**
     * Get feature flag usage statistics (delegates to FeatureFlagManager)
     */
    async getFeatureFlagStats(featureKey) {
        return this.manager.getFeatureFlagStats(featureKey);
    }
    /**
     * Record feature flag usage for analytics (delegates to FeatureFlagManager)
     */
    async recordFlagUsage(featureKey, userId, enabled) {
        return this.manager.recordFlagUsage(featureKey, userId, enabled);
    }
    /**
     * Get available feature flags from JSON configuration and default flags
     */
    getAvailableFlags() {
        const flags = [];
        const extractKeys = (obj, prefix = '') => {
            if (obj && typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'boolean') {
                        flags.push(fullKey);
                    }
                    else if (value && typeof value === 'object') {
                        // If this object has an 'enabled' property, add the parent key as a flag
                        if ('enabled' in value) {
                            flags.push(fullKey);
                        }
                        // Always recurse into objects to find nested flags
                        extractKeys(value, fullKey);
                    }
                }
            }
        };
        // Extract flags from JSON configuration
        extractKeys(this.jsonFlags);
        // Add default flags from manager
        const defaultFlags = this.manager.getDefaultFlags();
        for (const flagKey of Object.keys(defaultFlags)) {
            if (!flags.includes(flagKey)) {
                flags.push(flagKey);
            }
        }
        return flags;
    }
    /**
     * Validate feature flag key exists in configuration
     */
    isValidFeatureFlag(featureKey) {
        return this.getAvailableFlags().includes(featureKey);
    }
    /**
     * Get feature flag description from JSON configuration
     */
    getFeatureDescription(featureKey) {
        const parts = featureKey.split('.');
        let current = this.jsonFlags;
        for (const part of parts) {
            if (current && typeof current === 'object' && current !== null && part in current) {
                current = current[part];
            }
            else {
                return null;
            }
        }
        if (current && typeof current === 'object' && 'description' in current) {
            const desc = current.description;
            return typeof desc === 'string' ? desc : null;
        }
        return null;
    }
}
exports.FeatureFlagService = FeatureFlagService;
// Export singleton instance factory
let featureFlagServiceInstance = null;
function createFeatureFlagService(env) {
    if (!featureFlagServiceInstance) {
        featureFlagServiceInstance = new FeatureFlagService(env);
    }
    return featureFlagServiceInstance;
}
function getFeatureFlagService() {
    return featureFlagServiceInstance;
}
//# sourceMappingURL=feature-flag-service.js.map