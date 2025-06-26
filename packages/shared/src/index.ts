/**
 * @celebrum-ai/shared - Shared utilities and types
 */

// Types - export specific types to avoid conflicts
export type {
  // API types
  ApiResponse as TypesApiResponse,
  PaginatedResponse,
  ApiError as TypesApiError,
  RateLimitInfo as TypesRateLimitInfo,
  WebhookPayload,
  // Market types
  MarketData,
  OrderBook,
  Trade,
  Candle,
  // Trading types
  Order,
  Position,
  Portfolio,
  // User types
  User,
  UserRole as TypesUserRole,
  UserPreferences,
  UserSubscription,
  // Notification types
  Notification,
  NotificationType,
  NotificationChannel,
  // Environment types
  Env,
  // Risk management types
  RiskLevelType,
  PositionSizingMethodType,
  // User types
  UserRoleType,
  SubscriptionTierType,
  ExchangeIdType,
  // Trading configuration types
  TradingConfig,
  RiskManagementConfig,
  RBACOperationResult,
  TechnicalStrategy,
  StrategyLimits,
  OpportunityLimits,
  ApiAccess,
  UserAccessSummary,
  Opportunity,
  ArbitrageOpportunity,
} from './types';

// Export enums and constants
export {
  UserRole,
  RiskLevel,
  PositionSizingMethod,
  Permission,
  SubscriptionTier,
} from './types';

export type {
  UserRole as RBACUserRole,
  AccessContext,
} from './routes/rbac';

// Infrastructure - export with prefixes to avoid conflicts
export {
  ApiClient,
  ApiError as InfraApiError,
  ExternalApiManager,
  createTelegramClient,
  createOpenAIClient,
  createNewsApiClient,
  createCoinGeckoClient,
  externalApiManager,
  initializeDefaultClients,
} from './infrastructure/external-apis';

export type {
  ApiResponse as InfraApiResponse,
  RateLimitConfig as InfraRateLimitConfig,
} from './infrastructure/external-apis';

export {
  MarketDataSource,
  BinanceDataSource,
  CoinbaseDataSource,
  KrakenDataSource,
  DataSourceManager,
} from './infrastructure/data-sources';

export {
  CacheManager,
  CacheBackend,
  CloudflareKVBackend,
  MemoryBackend,
  cached,
  getCacheManager,
  initializeCacheManager,
} from './infrastructure/cache-manager';

// Routes - export with prefixes to avoid conflicts
export {
  RouteHandler,
} from './routes/handler';

export {
  RBACManager,
} from './routes/rbac';

export type {
  Permission as RBACPermission,
  Role as RBACRole,
} from './routes/rbac';

// Utilities
export * from './utils';

// Middleware
export * from './middleware';

// Configuration
export * from './config';

// Constants
export * from './constants';

// Errors
export * from './errors';

// Validation
export * from './validation';

// Services
export * from './services';