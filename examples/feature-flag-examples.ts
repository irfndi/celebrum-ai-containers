/**
 * Feature Flag System Examples
 * Practical examples of how to use the feature flag system in Celebrum AI
 */

import { FeatureFlagService } from '../src/shared/src/services/feature-flag-service';
import { 
  FeatureFlagUtils, 
  FeatureFlagConditional,
  RequireFeature,
  RequireFeatures,
  FeatureFlagCache
} from '../src/shared/src/utils/feature-flags';

// Example 1: Basic Feature Flag Usage
export class TradingService {
  private featureFlagService: FeatureFlagService;
  
  constructor(env: unknown) {
    this.featureFlagService = new FeatureFlagService(env);
    FeatureFlagUtils.initialize(env);
  }
  
  /**
   * Example: Check feature flag before executing trading logic
   */
  async executeTrade(userId: string, tradeData: unknown, userRole: string, subscriptionTier: string) {
    // Check if trading is enabled for this user
    const tradingEnabled = await FeatureFlagUtils.isEnabled('trading.enabled', {
      userId,
      role: userRole as unknown,
      subscriptionTier: subscriptionTier as unknown
    });
    
    if (!tradingEnabled) {
      throw new Error('Trading is disabled for this user');
    }
    
    // Check for advanced trading features
    const advancedTradingEnabled = await FeatureFlagUtils.isEnabled('trading.advanced_orders.enabled', {
      userId,
      role: userRole as unknown,
      subscriptionTier: subscriptionTier as unknown
    });
    
    if (advancedTradingEnabled) {
      console.log('Processing advanced trade:', tradeData);
    }
    
    // Execute the trade
    console.log('Executing trade for user:', userId);
    return { success: true, tradeId: `trade_${Date.now()}` };
  }
  
  /**
   * Example: Using decorator to protect method
   */
  @RequireFeature('trading.enabled')
  async getPortfolio(userId: string) {
    // This method will only execute if trading.enabled is true
    // for the user's role and subscription tier
    return {
      userId,
      balance: 10000,
      positions: []
    };
  }
  
  /**
   * Example: Requiring multiple features
   */
  @RequireFeatures(['trading.enabled', 'analytics.enabled'])
  async getAdvancedAnalytics(userId: string) {
    // Requires both trading and analytics to be enabled
    return {
      userId,
      analytics: {
        profitLoss: 1500,
        riskScore: 0.3,
        recommendations: ['Buy AAPL', 'Sell TSLA']
      }
    };
  }
}

// Example 2: UI Component with Feature Flags
export class DashboardComponent {
  /**
   * Example: Conditional UI rendering based on feature flags
   */
  async renderDashboard(userId: string, userRole: string, subscriptionTier: string) {
    const context = {
      userId,
      role: userRole as unknown,
      subscriptionTier: subscriptionTier as unknown
    };
    
    // Check multiple features at once for better performance
    const features = await FeatureFlagUtils.checkFeatures([
      'ui.new_dashboard.enabled',
      'analytics.real_time.enabled',
      'trading.enabled',
      'notifications.push.enabled'
    ], context);
    
    const dashboard = {
      layout: features['ui.new_dashboard.enabled'] ? 'new' : 'classic',
      sections: []
    };
    
    // Conditionally add sections based on feature flags
    if (features['trading.enabled']) {
      dashboard.sections.push({
        type: 'trading',
        component: 'TradingWidget'
      });
    }
    
    if (features['analytics.real_time.enabled']) {
      dashboard.sections.push({
        type: 'analytics',
        component: 'RealTimeAnalytics',
        realTime: true
      });
    } else if (features['analytics.enabled']) {
      dashboard.sections.push({
        type: 'analytics',
        component: 'BasicAnalytics',
        realTime: false
      });
    }
    
    if (features['notifications.push.enabled']) {
      dashboard.sections.push({
        type: 'notifications',
        component: 'PushNotifications'
      });
    }
    
    return dashboard;
  }
  
  /**
   * Example: A/B testing with feature flags
   */
  async renderCheckoutFlow(userId: string, userRole: string, subscriptionTier: string) {
    const context = {
      userId,
      role: userRole as unknown,
      subscriptionTier: subscriptionTier as unknown
    };
    
    // Use conditional execution for A/B testing
    const checkoutComponent = await FeatureFlagConditional.ifEnabledElse(
      'ui.new_checkout.enabled',
      () => {
        // New checkout flow
        return {
          component: 'NewCheckoutFlow',
          features: ['one_click_purchase', 'saved_payment_methods'],
          analytics: { variant: 'new_checkout' }
        };
      },
      () => {
        // Old checkout flow
        return {
          component: 'ClassicCheckoutFlow',
          features: ['basic_purchase'],
          analytics: { variant: 'classic_checkout' }
        };
      },
      context
    );
    
    return checkoutComponent;
  }
}

// Example 3: Admin Feature Flag Management
export class AdminService {
  private featureFlagService: FeatureFlagService;
  
  constructor(env: unknown) {
    this.featureFlagService = new FeatureFlagService(env);
  }
  
  /**
   * Example: Gradual feature rollout
   */
  async rolloutNewFeature(featureKey: string, adminUserId: string) {
    console.log(`Starting rollout for feature: ${featureKey}`);
    
    // Step 1: Enable for admins only
    await this.featureFlagService.setGlobalFlag(
      featureKey,
      true,
      adminUserId
    );
    
    console.log('✓ Feature enabled for admins');
    
    // Step 2: Enable for specific beta users
    const betaUsers = ['beta_user_1', 'beta_user_2', 'beta_user_3'];
    
    for (const userId of betaUsers) {
      await this.featureFlagService.setUserFlag(
        userId,
        featureKey,
        true,
        adminUserId
      );
    }
    
    console.log('✓ Feature enabled for beta users');
    
    // Step 3: Monitor usage and feedback
    setTimeout(async () => {
      const stats = await this.featureFlagService.getFeatureFlagStats(featureKey);
      console.log('Feature usage stats:', stats);
      
      if ((stats as unknown as { totalChecks: number; enabledChecks: number }).totalChecks > 100 && (stats as unknown as { totalChecks: number; enabledChecks: number }).enabledChecks / (stats as unknown as { totalChecks: number; enabledChecks: number }).totalChecks > 0.8) {
        console.log('✓ Feature performing well, ready for wider rollout');
      }
    }, 24 * 60 * 60 * 1000); // Check after 24 hours
  }
  
  /**
   * Example: Emergency feature disable
   */
  async emergencyDisable(featureKey: string, adminUserId: string, reason: string) {
    console.log(`Emergency disable for feature: ${featureKey}`);
    console.log(`Reason: ${reason}`);
    
    // Disable globally
    const result = await this.featureFlagService.setGlobalFlag(
      featureKey,
      false,
      adminUserId
    );
    
    if (result.success) {
      console.log('✓ Feature disabled globally');
      
      // Clear user-specific overrides
      // Note: In a real implementation, you'd need to track user overrides
      // and remove them individually
      // const userFlags = await this.featureFlagService.getFeatureFlagConfig(featureKey);
      
      // Clear cache to ensure immediate effect
      FeatureFlagCache.clearCache(featureKey);
      
      console.log('✓ Cache cleared, changes are immediate');
    } else {
      console.error('✗ Failed to disable feature:', (result as unknown as { error: string }).error);
    }
  }
  
  /**
   * Example: Feature flag analytics dashboard
   */
  async getFeatureFlagDashboard() {
    const availableFlags = this.featureFlagService.getAvailableFlags();
    const dashboard = [];
    
    for (const flag of availableFlags) {
      const stats = await this.featureFlagService.getFeatureFlagStats(flag);
      const config = await this.featureFlagService.getFeatureFlagConfig(flag);
      
      dashboard.push({
        flag,
        description: this.featureFlagService.getFeatureDescription(flag),
        enabled: (config as unknown as { enabled?: boolean })?.enabled || false,
        usage: {
          totalChecks: (stats as unknown as { totalChecks: number }).totalChecks,
           enabledChecks: (stats as unknown as { enabledChecks: number }).enabledChecks,
           disabledChecks: (stats as unknown as { disabledChecks: number }).disabledChecks,
           uniqueUsers: (stats as unknown as { uniqueUsers: number }).uniqueUsers,
           lastUsed: (stats as unknown as { lastUsed: string }).lastUsed
        },
        health: this.calculateFeatureHealth(stats)
      });
    }
    
    return dashboard.sort((a, b) => (b as unknown as { usage: { totalChecks: number } }).usage.totalChecks - (a as unknown as { usage: { totalChecks: number } }).usage.totalChecks);
  }
  
  private calculateFeatureHealth(stats: unknown): 'healthy' | 'warning' | 'critical' {
    if ((stats as unknown as { totalChecks: number }).totalChecks === 0) return 'warning'; // Unused feature
    
    const enabledRatio = (stats as unknown as { enabledChecks: number; totalChecks: number }).enabledChecks / (stats as unknown as { enabledChecks: number; totalChecks: number }).totalChecks;
    
    if (enabledRatio > 0.8) return 'healthy';
    if (enabledRatio > 0.5) return 'warning';
    return 'critical';
  }
}

// Example 4: Performance Optimization with Caching
export class PerformanceOptimizedService {
  /**
   * Example: Using cached feature flag checks for high-frequency operations
   */
  async processHighVolumeRequests(requests: unknown[]) {
    const results = [];
    
    for (const request of requests) {
      const requestTyped = request as { userId: string; userRole: string; subscriptionTier: string };
      const context = {
        userId: requestTyped.userId,
        role: requestTyped.userRole,
        subscriptionTier: requestTyped.subscriptionTier
      };
      
      // Use cached check for better performance
      const canProcess = await FeatureFlagCache.getCached(
        'api.high_volume_processing.enabled',
        context
      );
      
      if (canProcess) {
        results.push(await this.processRequest(request));
      } else {
        results.push({ error: 'Feature not available' });
      }
    }
    
    return results;
  }
  
  private async processRequest(request: unknown) {
    // Simulate request processing
    return { success: true, requestId: (request as { id: string }).id };
  }
}

// Example 5: Integration with Express.js Routes
export function setupFeatureFlagRoutes(app: unknown, env: unknown) {
  const featureFlagService = new FeatureFlagService(env as unknown);
  
  // Middleware to check feature flags
  const requireFeature = (featureKey: string) => {
    return async (req: unknown, res: unknown, next: unknown) => {
      const reqTyped = req as { user?: { id: string; role: string; subscriptionTier: string } };
      const context = {
        userId: reqTyped.user?.id,
        role: reqTyped.user?.role,
        subscriptionTier: reqTyped.user?.subscriptionTier
      };
      
      const isEnabled = await FeatureFlagUtils.isEnabled(featureKey, context);
      
      if (!isEnabled) {
        return (res as unknown as { status: (code: number) => { json: (data: unknown) => void } }).status(403).json({
          error: 'Feature not available',
          featureKey,
          message: 'This feature is not available for your account level'
        });
      }
      
      (next as () => void)();
    };
  };
  
  // Protected routes
  (app as { get: (path: string, ...handlers: unknown[]) => void }).get('/api/trading/portfolio', 
    requireFeature('trading.enabled'),
    async (req: unknown, res: unknown) => {
      // Route implementation
      (res as unknown as { json: (data: unknown) => void }).json({ portfolio: 'data' });
    }
  );
  
  (app as { get: (path: string, ...handlers: unknown[]) => void }).get('/api/analytics/advanced',
    requireFeature('analytics.advanced.enabled'),
    async (req: unknown, res: unknown) => {
      // Route implementation
      (res as unknown as { json: (data: unknown) => void }).json({ analytics: 'advanced data' });
    }
  );
  
  // Admin routes for feature flag management
  (app as { post: (path: string, ...handlers: unknown[]) => void }).post('/api/admin/feature-flags/global',
    requireFeature('admin.feature_flags.enabled'),
    async (req: unknown, res: unknown) => {
      const { featureKey, enabled } = (req as unknown as { body: unknown }).body;
      const adminUserId = (req as unknown as { user: { id: string } }).user.id;
      
      const result = await featureFlagService.setGlobalFlag(
        featureKey,
        enabled,
        adminUserId
      );
      
      (res as unknown as { json: (data: unknown) => void }).json(result);
    }
  );
}

// Example 6: Testing Feature Flags
export class FeatureFlagTestHelpers {
  private featureFlagService: FeatureFlagService;
  
  constructor(env: unknown) {
    this.featureFlagService = new FeatureFlagService(env);
  }
  
  /**
   * Helper for testing with feature flags enabled
   */
  async withFeatureEnabled<T>(
    featureKey: string,
    userId: string,
    adminUserId: string,
    testFn: () => Promise<T>
  ): Promise<T> {
    // Enable feature for test
    await this.featureFlagService.setUserFlag(
      userId,
      featureKey,
      true,
      adminUserId
    );
    
    try {
      // Run test
      const result = await testFn();
      return result;
    } finally {
      // Cleanup
      await this.featureFlagService.removeUserFlag(
        userId,
        featureKey,
        adminUserId
      );
    }
  }
  
  /**
   * Helper for testing with feature flags disabled
   */
  async withFeatureDisabled<T>(
    featureKey: string,
    userId: string,
    adminUserId: string,
    testFn: () => Promise<T>
  ): Promise<T> {
    // Disable feature for test
    await this.featureFlagService.setUserFlag(
      userId,
      featureKey,
      false,
      adminUserId
    );
    
    try {
      // Run test
      const result = await testFn();
      return result;
    } finally {
      // Cleanup
      await this.featureFlagService.removeUserFlag(
        userId,
        featureKey,
        adminUserId
      );
    }
  }
}

// Example usage in tests:
/*
const testHelpers = new FeatureFlagTestHelpers(env);

test('trading should work when feature is enabled', async () => {
  await testHelpers.withFeatureEnabled(
    'trading.enabled',
    'test-user',
    'admin-user',
    async () => {
      const tradingService = new TradingService(env);
      const result = await tradingService.executeTrade(
        'test-user',
        { amount: 100 },
        'pro',
        'pro'
      );
      expect(result.success).toBe(true);
    }
  );
});

test('trading should fail when feature is disabled', async () => {
  await testHelpers.withFeatureDisabled(
    'trading.enabled',
    'test-user',
    'admin-user',
    async () => {
      const tradingService = new TradingService(env);
      await expect(
        tradingService.executeTrade(
          'test-user',
          { amount: 100 },
          'pro',
          'pro'
        )
      ).rejects.toThrow('Trading feature is not available');
    }
  );
});
*/