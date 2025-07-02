/**
 * Feature Flag Routes and Handlers
 * Provides HTTP endpoints for feature flag management
 */

import type { FeatureFlagService} from '../services/feature-flag-service';
import { createFeatureFlagService } from '../services/feature-flag-service';
import type { UserRoleType, SubscriptionTierType} from '../types';

export interface FeatureFlagRequest {
  featureKey: string;
  userId?: string;
  role?: UserRoleType;
  subscriptionTier?: SubscriptionTierType;
}

export interface SetFeatureFlagRequest extends FeatureFlagRequest {
  enabled: boolean;
  adminUserId: string;
}

export interface FeatureFlagResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}

export interface FeatureFlagListResponse {
  success: boolean;
  flags: Record<string, boolean>;
  availableFlags: string[];
  timestamp: number;
}

/**
 * Feature Flag Route Handlers
 */
export class FeatureFlagRoutes {
  private service: FeatureFlagService;

  constructor(env: unknown) {
    this.service = createFeatureFlagService(env);
  }

  /**
   * Check if a specific feature is enabled
   * GET /api/feature-flags/check
   */
  async checkFeatureFlag(request: FeatureFlagRequest): Promise<FeatureFlagResponse> {
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

      const enabled = await this.service.isFeatureEnabled(
        featureKey,
        userId,
        role,
        subscriptionTier
      );

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
    } catch {
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
  async getUserFeatureFlags(
    userId: string,
    role: UserRoleType,
    subscriptionTier: SubscriptionTierType
  ): Promise<FeatureFlagListResponse> {
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
    } catch {
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
  async setGlobalFeatureFlag(request: SetFeatureFlagRequest): Promise<FeatureFlagResponse> {
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
    } catch (error) {
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
  async setUserFeatureFlag(request: SetFeatureFlagRequest): Promise<FeatureFlagResponse> {
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
    } catch (error) {
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
  async removeUserFeatureFlag(
    userId: string,
    featureKey: string,
    adminUserId: string
  ): Promise<FeatureFlagResponse> {
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
    } catch (error) {
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
  async getFeatureFlagConfig(featureKey: string): Promise<FeatureFlagResponse> {
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
          ...(typeof config === 'object' && config !== null ? config as Record<string, unknown> : {}),
          description
        },
        timestamp: Date.now()
      };
    } catch (error) {
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
  async getFeatureFlagStats(featureKey: string): Promise<FeatureFlagResponse> {
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
    } catch (error) {
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
  async getAvailableFeatureFlags(): Promise<FeatureFlagResponse> {
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
    } catch (error) {
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
  async bulkCheckFeatureFlags(
    featureKeys: string[],
    userId?: string,
    role?: UserRoleType,
    subscriptionTier?: SubscriptionTierType
  ): Promise<FeatureFlagResponse> {
    try {
      if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
        return {
          success: false,
          error: 'Feature keys array is required and must not be empty',
          timestamp: Date.now()
        };
      }

      const results: Record<string, boolean> = {};
      const errors: string[] = [];

      for (const featureKey of featureKeys) {
        try {
          if (!this.service.isValidFeatureFlag(featureKey)) {
            errors.push(`Invalid feature flag: ${featureKey}`);
            continue;
          }

          const enabled = await this.service.isFeatureEnabled(
            featureKey,
            userId,
            role,
            subscriptionTier
          );

          results[featureKey] = enabled;

          // Record usage for analytics
          if (userId) {
            await this.service.recordFlagUsage(featureKey, userId, enabled);
          }
        } catch (error) {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }
}

/**
 * Utility functions for feature flag middleware
 */
export class FeatureFlagMiddleware {
  private service: FeatureFlagService;

  constructor(env: unknown) {
    this.service = createFeatureFlagService(env);
  }

  /**
   * Middleware to check if a feature is enabled before proceeding
   */
  requireFeature(featureKey: string) {
    return async (
      userId?: string,
      role?: UserRoleType,
      subscriptionTier?: SubscriptionTierType
    ): Promise<{ allowed: boolean; reason?: string }> => {
      try {
        if (!this.service.isValidFeatureFlag(featureKey)) {
          return {
            allowed: false,
            reason: `Invalid feature flag: ${featureKey}`
          };
        }

        const enabled = await this.service.isFeatureEnabled(
          featureKey,
          userId,
          role,
          subscriptionTier
        );

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
      } catch (error) {
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
  requireFeatures(featureKeys: string[]) {
    return async (
      userId?: string,
      role?: UserRoleType,
      subscriptionTier?: SubscriptionTierType
    ): Promise<{ allowed: boolean; reason?: string; results?: Record<string, boolean> }> => {
      try {
        const results: Record<string, boolean> = {};
        let allEnabled = true;
        const disabledFeatures: string[] = [];

        for (const featureKey of featureKeys) {
          if (!this.service.isValidFeatureFlag(featureKey)) {
            return {
              allowed: false,
              reason: `Invalid feature flag: ${featureKey}`
            };
          }

          const enabled = await this.service.isFeatureEnabled(
            featureKey,
            userId,
            role,
            subscriptionTier
          );

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
      } catch (error) {
        return {
          allowed: false,
          reason: `Error checking feature flags: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    };
  }
}