"use strict";
/**
 * Feature Flag Routes and Handlers
 * Provides HTTP endpoints for feature flag management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagMiddleware = exports.FeatureFlagRoutes = void 0;
const feature_flag_service_1 = require("../services/feature-flag-service");
/**
 * Feature Flag Route Handlers
 */
class FeatureFlagRoutes {
    service;
    constructor(env) {
        this.service = (0, feature_flag_service_1.createFeatureFlagService)(env);
    }
    /**
     * Check if a specific feature is enabled
     * GET /api/feature-flags/check
     */
    async checkFeatureFlag(request) {
        try {
            const { featureKey, userId, role, subscriptionTier } = request;
            if (!featureKey) {
                return {
                    success: false,
                    error: 'Feature key is required',
                    timestamp: Date.now()
                };
            }
            if (!this.service.isValidFeatureFlag(featureKey)) {
                return {
                    success: false,
                    error: `Invalid feature flag: ${featureKey}`,
                    timestamp: Date.now()
                };
            }
            const enabled = await this.service.isFeatureEnabled(featureKey, userId, role, subscriptionTier);
            // Record usage for analytics
            if (userId) {
                await this.service.recordFlagUsage(featureKey, userId, enabled);
            }
            return {
                success: true,
                data: {
                    featureKey,
                    enabled,
                    userId,
                    role,
                    subscriptionTier
                },
                timestamp: Date.now()
            };
        }
        catch {
            return {
                success: false,
                error: 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Get all feature flags for a user
     * GET /api/feature-flags/user
     */
    async getUserFeatureFlags(userId, role, subscriptionTier) {
        try {
            if (!userId || !role || !subscriptionTier) {
                return {
                    success: false,
                    flags: {},
                    availableFlags: [],
                    timestamp: Date.now()
                };
            }
            const flags = await this.service.getUserFeatureFlags(userId, role, subscriptionTier);
            const availableFlags = this.service.getAvailableFlags();
            return {
                success: true,
                flags,
                availableFlags,
                timestamp: Date.now()
            };
        }
        catch {
            return {
                success: false,
                flags: {},
                availableFlags: this.service.getAvailableFlags(),
                timestamp: Date.now()
            };
        }
    }
    /**
     * Set global feature flag
     * POST /api/feature-flags/global
     */
    async setGlobalFeatureFlag(request) {
        try {
            const { featureKey, enabled, adminUserId } = request;
            if (!featureKey || enabled === undefined || !adminUserId) {
                return {
                    success: false,
                    error: 'Feature key, enabled status, and admin user ID are required',
                    timestamp: Date.now()
                };
            }
            const result = await this.service.setGlobalFlag(featureKey, enabled, adminUserId);
            return {
                success: result.success,
                data: result.data,
                error: result.success ? undefined : result.message,
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Set user-specific feature flag override
     * POST /api/feature-flags/user
     */
    async setUserFeatureFlag(request) {
        try {
            const { featureKey, enabled, adminUserId, userId } = request;
            if (!featureKey || enabled === undefined || !adminUserId || !userId) {
                return {
                    success: false,
                    error: 'Feature key, enabled status, admin user ID, and user ID are required',
                    timestamp: Date.now()
                };
            }
            const result = await this.service.setUserFlag(userId, featureKey, enabled, adminUserId);
            return {
                success: result.success,
                data: result.data,
                error: result.success ? undefined : result.message,
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Remove user-specific feature flag override
     * DELETE /api/feature-flags/user
     */
    async removeUserFeatureFlag(userId, featureKey, adminUserId) {
        try {
            if (!userId || !featureKey || !adminUserId) {
                return {
                    success: false,
                    error: 'User ID, feature key, and admin user ID are required',
                    timestamp: Date.now()
                };
            }
            const result = await this.service.removeUserFlag(userId, featureKey, adminUserId);
            return {
                success: result.success,
                data: result.data,
                error: result.success ? undefined : result.message,
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Get feature flag configuration and metadata
     * GET /api/feature-flags/config
     */
    async getFeatureFlagConfig(featureKey) {
        try {
            if (!featureKey) {
                return {
                    success: false,
                    error: 'Feature key is required',
                    timestamp: Date.now()
                };
            }
            const config = await this.service.getFeatureFlagConfig(featureKey);
            const description = this.service.getFeatureDescription(featureKey);
            return {
                success: true,
                data: {
                    ...(typeof config === 'object' && config !== null ? config : {}),
                    description
                },
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Get feature flag usage statistics
     * GET /api/feature-flags/stats
     */
    async getFeatureFlagStats(featureKey) {
        try {
            if (!featureKey) {
                return {
                    success: false,
                    error: 'Feature key is required',
                    timestamp: Date.now()
                };
            }
            const stats = await this.service.getFeatureFlagStats(featureKey);
            return {
                success: true,
                data: stats,
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Get all available feature flags
     * GET /api/feature-flags/available
     */
    async getAvailableFeatureFlags() {
        try {
            const availableFlags = this.service.getAvailableFlags();
            const flagsWithDescriptions = availableFlags.map(flag => ({
                key: flag,
                description: this.service.getFeatureDescription(flag)
            }));
            return {
                success: true,
                data: {
                    flags: flagsWithDescriptions,
                    count: availableFlags.length
                },
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    /**
     * Bulk check multiple feature flags
     * POST /api/feature-flags/bulk-check
     */
    async bulkCheckFeatureFlags(featureKeys, userId, role, subscriptionTier) {
        try {
            if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
                return {
                    success: false,
                    error: 'Feature keys array is required and must not be empty',
                    timestamp: Date.now()
                };
            }
            const results = {};
            const errors = [];
            for (const featureKey of featureKeys) {
                try {
                    if (!this.service.isValidFeatureFlag(featureKey)) {
                        errors.push(`Invalid feature flag: ${featureKey}`);
                        continue;
                    }
                    const enabled = await this.service.isFeatureEnabled(featureKey, userId, role, subscriptionTier);
                    results[featureKey] = enabled;
                    // Record usage for analytics
                    if (userId) {
                        await this.service.recordFlagUsage(featureKey, userId, enabled);
                    }
                }
                catch (error) {
                    errors.push(`Error checking ${featureKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            return {
                success: errors.length === 0,
                data: {
                    results,
                    errors: errors.length > 0 ? errors : undefined,
                    userId,
                    role,
                    subscriptionTier
                },
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
}
exports.FeatureFlagRoutes = FeatureFlagRoutes;
/**
 * Utility functions for feature flag middleware
 */
class FeatureFlagMiddleware {
    service;
    constructor(env) {
        this.service = (0, feature_flag_service_1.createFeatureFlagService)(env);
    }
    /**
     * Middleware to check if a feature is enabled before proceeding
     */
    requireFeature(featureKey) {
        return async (userId, role, subscriptionTier) => {
            try {
                if (!this.service.isValidFeatureFlag(featureKey)) {
                    return {
                        allowed: false,
                        reason: `Invalid feature flag: ${featureKey}`
                    };
                }
                const enabled = await this.service.isFeatureEnabled(featureKey, userId, role, subscriptionTier);
                if (!enabled) {
                    return {
                        allowed: false,
                        reason: `Feature '${featureKey}' is not enabled for this user`
                    };
                }
                // Record usage
                if (userId) {
                    await this.service.recordFlagUsage(featureKey, userId, true);
                }
                return { allowed: true };
            }
            catch (error) {
                return {
                    allowed: false,
                    reason: `Error checking feature flag: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        };
    }
    /**
     * Check multiple features at once
     */
    requireFeatures(featureKeys) {
        return async (userId, role, subscriptionTier) => {
            try {
                const results = {};
                let allEnabled = true;
                const disabledFeatures = [];
                for (const featureKey of featureKeys) {
                    if (!this.service.isValidFeatureFlag(featureKey)) {
                        return {
                            allowed: false,
                            reason: `Invalid feature flag: ${featureKey}`
                        };
                    }
                    const enabled = await this.service.isFeatureEnabled(featureKey, userId, role, subscriptionTier);
                    results[featureKey] = enabled;
                    if (!enabled) {
                        allEnabled = false;
                        disabledFeatures.push(featureKey);
                    }
                    // Record usage
                    if (userId) {
                        await this.service.recordFlagUsage(featureKey, userId, enabled);
                    }
                }
                if (!allEnabled) {
                    return {
                        allowed: false,
                        reason: `Features not enabled: ${disabledFeatures.join(', ')}`,
                        results
                    };
                }
                return { allowed: true, results };
            }
            catch (error) {
                return {
                    allowed: false,
                    reason: `Error checking feature flags: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        };
    }
}
exports.FeatureFlagMiddleware = FeatureFlagMiddleware;
//# sourceMappingURL=feature-flags.js.map