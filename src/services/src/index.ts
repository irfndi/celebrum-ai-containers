// @celebrum-ai/services - Main exports

export { ServiceRouter } from '../../shared/src/middleware/router';
export { ApiAccessManager } from '../../shared/src/routes/api-access-manager';
export { OpportunityManager } from './opportunities/src/opportunity-manager';
export { FeatureFlagManager } from '../../shared/src/config/feature-flag-manager';
export { TechnicalStrategyManager } from './opportunities/technical-strategy-manager';
export { TradingConfigManager } from './trading/src/trading-config-manager';
export { RBACService } from '../../shared/src/middleware/rbac';
export { CronHandler } from '../../shared/src/infrastructure/cron';