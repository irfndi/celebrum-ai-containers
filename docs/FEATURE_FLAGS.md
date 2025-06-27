# Feature Flag System Documentation

The Celebrum AI platform includes a comprehensive feature flag system that allows for dynamic control of features across different user roles, subscription tiers, and individual users.

## Overview

The feature flag system consists of several components:

- **FeatureFlagService**: Core service for managing feature flags
- **FeatureFlagRoutes**: API endpoints for feature flag operations
- **FeatureFlagUtils**: Utility functions and decorators
- **FeatureFlagMiddleware**: Middleware for protecting routes
- **JSON Configuration**: Static feature flag definitions

## Quick Start

### Basic Usage

```typescript
import { FeatureFlagUtils } from '@celebrum/shared';

// Initialize the service (usually done at app startup)
FeatureFlagUtils.initialize(env);

// Check if a feature is enabled for a user
const isEnabled = await FeatureFlagUtils.isEnabled('trading.enabled', {
  userId: 'user123',
  role: 'pro',
  subscriptionTier: 'pro'
});

if (isEnabled) {
  // Feature is enabled, proceed with functionality
  console.log('Trading feature is enabled!');
}
```

### Using Decorators

```typescript
import { RequireFeature, RequireFeatures } from '@celebrum/shared';

class TradingService {
  @RequireFeature('trading.enabled')
  async executeTrade(userId: string, tradeData: any) {
    // This method will only execute if trading.enabled is true
    // for the user's role and subscription tier
  }
  
  @RequireFeatures(['trading.enabled', 'analytics.enabled'])
  async getAdvancedTradingAnalytics(userId: string) {
    // Requires both features to be enabled
  }
}
```

## Configuration

### JSON Configuration File

Feature flags are defined in `feature_flags.json`:

```json
{
  "automated_cleanup": {
    "enabled": true,
    "description": "Automated cleanup of old data",
    "roles": ["admin", "superadmin"],
    "subscription_tiers": ["pro", "ultra", "enterprise"],
    "sub_features": {
      "old_trades": {
        "enabled": true,
        "cleanup_days": 90
      }
    }
  },
  "trading": {
    "enabled": true,
    "description": "Trading functionality",
    "roles": ["pro", "ultra", "admin", "superadmin"],
    "subscription_tiers": ["pro", "ultra", "enterprise"]
  }
}
```

### Dynamic Configuration

Feature flags can be modified at runtime:

```typescript
import { FeatureFlagService } from '@celebrum/shared';

const service = new FeatureFlagService(env);

// Set a global feature flag
await service.setGlobalFlag('new_feature.enabled', true, 'admin-user-id');

// Set a user-specific override
await service.setUserFlag('user123', 'beta_feature.enabled', true, 'admin-user-id');

// Remove a user-specific override
await service.removeUserFlag('user123', 'beta_feature.enabled', 'admin-user-id');
```

## API Endpoints

The system provides REST API endpoints for feature flag management:

### Check Feature Flag

```http
POST /api/feature-flags/check
Content-Type: application/json

{
  "featureKey": "trading.enabled",
  "userId": "user123",
  "role": "pro",
  "subscriptionTier": "pro"
}
```

### Get User Feature Flags

```http
GET /api/feature-flags/user/user123?role=pro&subscriptionTier=pro
```

### Set Global Feature Flag (Admin Only)

```http
POST /api/feature-flags/global
Content-Type: application/json

{
  "featureKey": "new_feature.enabled",
  "enabled": true,
  "adminUserId": "admin123"
}
```

### Bulk Check Feature Flags

```http
POST /api/feature-flags/bulk-check
Content-Type: application/json

{
  "featureKeys": ["trading.enabled", "analytics.enabled"],
  "userId": "user123",
  "role": "pro",
  "subscriptionTier": "pro"
}
```

## Advanced Features

### Conditional Execution

```typescript
import { FeatureFlagConditional } from '@celebrum/shared';

// Execute function only if feature is enabled
const result = await FeatureFlagConditional.ifEnabled(
  'advanced_analytics.enabled',
  () => performAdvancedAnalytics(),
  { userId: 'user123', role: 'pro', subscriptionTier: 'pro' }
);

// Execute different functions based on feature status
const result2 = await FeatureFlagConditional.ifEnabledElse(
  'new_ui.enabled',
  () => renderNewUI(),
  () => renderOldUI(),
  { userId: 'user123', role: 'pro', subscriptionTier: 'pro' }
);
```

### Caching

The system includes built-in caching for performance:

```typescript
import { FeatureFlagCache } from '@celebrum/shared';

// Get cached result (automatically caches for 5 minutes)
const isEnabled = await FeatureFlagCache.getCached('trading.enabled', {
  userId: 'user123',
  role: 'pro',
  subscriptionTier: 'pro'
});

// Clear specific cache entry
FeatureFlagCache.clearCache('trading.enabled');

// Clear all cache
FeatureFlagCache.clearCache();
```

### A/B Testing

```typescript
// Simple A/B test based on user ID
const variant = await FeatureFlagConditional.abTest(
  'new_checkout_flow',
  { userId: 'user123', role: 'pro', subscriptionTier: 'pro' },
  {
    variants: ['control', 'variant_a', 'variant_b'],
    weights: [50, 25, 25] // Percentage distribution
  }
);

switch (variant) {
  case 'variant_a':
    // Show variant A
    break;
  case 'variant_b':
    // Show variant B
    break;
  default:
    // Show control
    break;
}
```

## Role and Subscription Tier Access

### User Roles

- `free`: Basic free tier users
- `pro`: Professional tier users
- `ultra`: Ultra tier users
- `admin`: Administrative users
- `superadmin`: Super administrative users

### Subscription Tiers

- `free`: Free subscription
- `pro`: Professional subscription
- `ultra`: Ultra subscription
- `enterprise`: Enterprise subscription

### Access Control

Feature flags can be restricted by role and subscription tier:

```json
{
  "premium_feature": {
    "enabled": true,
    "roles": ["pro", "ultra", "admin", "superadmin"],
    "subscription_tiers": ["pro", "ultra", "enterprise"]
  }
}
```

## Middleware Protection

Protect routes with feature flag middleware:

```typescript
import { FeatureFlagMiddleware } from '@celebrum/shared';

const middleware = new FeatureFlagMiddleware(env);

// Protect a route with a single feature
app.get('/api/trading', 
  middleware.requireFeature('trading.enabled'),
  (req, res) => {
    // Route handler
  }
);

// Protect a route with multiple features
app.get('/api/advanced-analytics',
  middleware.requireFeatures(['analytics.enabled', 'premium_features.enabled']),
  (req, res) => {
    // Route handler
  }
);
```

## Monitoring and Analytics

### Usage Statistics

```typescript
// Get feature flag usage statistics
const stats = await service.getFeatureFlagStats('trading.enabled');
console.log(stats);
// {
//   totalChecks: 1250,
//   enabledChecks: 980,
//   disabledChecks: 270,
//   uniqueUsers: 45,
//   lastUsed: '2024-01-15T10:30:00Z'
// }

// Record custom usage
await service.recordFlagUsage('custom_feature.enabled', 'user123', true);
```

### Audit Trail

All feature flag changes are automatically logged:

```typescript
// Changes are automatically logged when using:
await service.setGlobalFlag('feature.enabled', true, 'admin123');
await service.setUserFlag('user123', 'feature.enabled', false, 'admin123');

// Logs include:
// - Timestamp
// - Admin user who made the change
// - Feature flag key
// - Old and new values
// - Change type (global/user)
```

## Best Practices

### 1. Naming Conventions

Use hierarchical naming with dots:

```
trading.enabled
trading.advanced_orders.enabled
analytics.real_time.enabled
ui.new_dashboard.enabled
```

### 2. Default Values

Always provide sensible defaults in the JSON configuration:

```json
{
  "new_feature": {
    "enabled": false,  // Start disabled for safety
    "description": "New experimental feature",
    "roles": ["admin", "superadmin"]  // Limit to admins initially
  }
}
```

### 3. Gradual Rollouts

1. Start with admin/superadmin only
2. Expand to specific users via user overrides
3. Expand to higher subscription tiers
4. Finally enable for all users

### 4. Cleanup

Regularly review and remove unused feature flags:

```typescript
// Get all available flags
const flags = service.getAvailableFlags();

// Check usage statistics
for (const flag of flags) {
  const stats = await service.getFeatureFlagStats(flag);
  if (stats.totalChecks === 0) {
    console.log(`Flag ${flag} is unused and can be removed`);
  }
}
```

### 5. Testing

Always test both enabled and disabled states:

```typescript
// Test with feature enabled
await service.setUserFlag('test-user', 'feature.enabled', true, 'admin');
const resultEnabled = await testFeatureBehavior('test-user');

// Test with feature disabled
await service.setUserFlag('test-user', 'feature.enabled', false, 'admin');
const resultDisabled = await testFeatureBehavior('test-user');

// Cleanup
await service.removeUserFlag('test-user', 'feature.enabled', 'admin');
```

## Error Handling

The system provides comprehensive error handling:

```typescript
try {
  const result = await service.setGlobalFlag('invalid.flag', true, 'admin');
  if (!result.success) {
    console.error('Failed to set flag:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Performance Considerations

1. **Caching**: Results are cached for 5 minutes by default
2. **Batch Operations**: Use bulk check for multiple flags
3. **Async Operations**: All operations are asynchronous
4. **Memory Usage**: Cache is automatically cleaned of expired entries

## Migration Guide

When migrating from other feature flag systems:

1. Export existing flag configurations
2. Convert to the JSON format
3. Update code to use new decorators and utilities
4. Test thoroughly in staging environment
5. Deploy with monitoring

## Troubleshooting

### Common Issues

1. **Feature not working**: Check role and subscription tier restrictions
2. **Cache issues**: Clear cache or wait for expiration
3. **Permission errors**: Ensure admin privileges for flag modifications
4. **Invalid flag keys**: Use `isValidFeatureFlag()` to validate

### Debug Mode

```typescript
// Enable debug logging
process.env.FEATURE_FLAG_DEBUG = 'true';

// Check detailed feature status
const result = await FeatureFlagUtils.checkFeature('trading.enabled', {
  userId: 'user123',
  role: 'pro',
  subscriptionTier: 'pro'
});

console.log(result);
// {
//   enabled: true,
//   source: 'global',
//   reason: 'Feature enabled globally',
//   metadata: { ... }
// }
```

## Security Considerations

1. **Admin Access**: Only admin/superadmin users can modify global flags
2. **Audit Trail**: All changes are logged with user attribution
3. **Validation**: All inputs are validated before processing
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints
5. **Encryption**: Sensitive flag data should be encrypted in storage

## Contributing

When adding new features to the feature flag system:

1. Update the JSON schema if needed
2. Add comprehensive tests
3. Update this documentation
4. Consider backward compatibility
5. Add appropriate error handling

For questions or issues, please refer to the main project documentation or create an issue in the repository.