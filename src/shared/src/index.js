"use strict";
/**
 * @celebrum-ai/shared - Shared utilities and types
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACManager = exports.RouteHandler = exports.initializeCacheManager = exports.getCacheManager = exports.cached = exports.MemoryBackend = exports.CloudflareKVBackend = exports.CacheBackend = exports.CacheManager = exports.DataSourceManager = exports.KrakenDataSource = exports.CoinbaseDataSource = exports.BinanceDataSource = exports.MarketDataSource = exports.initializeDefaultClients = exports.externalApiManager = exports.createCoinGeckoClient = exports.createNewsApiClient = exports.createOpenAIClient = exports.createTelegramClient = exports.ExternalApiManager = exports.InfraApiError = exports.ApiClient = exports.SubscriptionTier = exports.Permission = exports.PositionSizingMethod = exports.RiskLevel = exports.UserRole = void 0;
// Export enums and constants
var types_1 = require("./types");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return types_1.UserRole; } });
Object.defineProperty(exports, "RiskLevel", { enumerable: true, get: function () { return types_1.RiskLevel; } });
Object.defineProperty(exports, "PositionSizingMethod", { enumerable: true, get: function () { return types_1.PositionSizingMethod; } });
Object.defineProperty(exports, "Permission", { enumerable: true, get: function () { return types_1.Permission; } });
Object.defineProperty(exports, "SubscriptionTier", { enumerable: true, get: function () { return types_1.SubscriptionTier; } });
// Infrastructure - export with prefixes to avoid conflicts
var external_apis_1 = require("./infrastructure/external-apis");
Object.defineProperty(exports, "ApiClient", { enumerable: true, get: function () { return external_apis_1.ApiClient; } });
Object.defineProperty(exports, "InfraApiError", { enumerable: true, get: function () { return external_apis_1.ApiError; } });
Object.defineProperty(exports, "ExternalApiManager", { enumerable: true, get: function () { return external_apis_1.ExternalApiManager; } });
Object.defineProperty(exports, "createTelegramClient", { enumerable: true, get: function () { return external_apis_1.createTelegramClient; } });
Object.defineProperty(exports, "createOpenAIClient", { enumerable: true, get: function () { return external_apis_1.createOpenAIClient; } });
Object.defineProperty(exports, "createNewsApiClient", { enumerable: true, get: function () { return external_apis_1.createNewsApiClient; } });
Object.defineProperty(exports, "createCoinGeckoClient", { enumerable: true, get: function () { return external_apis_1.createCoinGeckoClient; } });
Object.defineProperty(exports, "externalApiManager", { enumerable: true, get: function () { return external_apis_1.externalApiManager; } });
Object.defineProperty(exports, "initializeDefaultClients", { enumerable: true, get: function () { return external_apis_1.initializeDefaultClients; } });
var data_sources_1 = require("./infrastructure/data-sources");
Object.defineProperty(exports, "MarketDataSource", { enumerable: true, get: function () { return data_sources_1.MarketDataSource; } });
Object.defineProperty(exports, "BinanceDataSource", { enumerable: true, get: function () { return data_sources_1.BinanceDataSource; } });
Object.defineProperty(exports, "CoinbaseDataSource", { enumerable: true, get: function () { return data_sources_1.CoinbaseDataSource; } });
Object.defineProperty(exports, "KrakenDataSource", { enumerable: true, get: function () { return data_sources_1.KrakenDataSource; } });
Object.defineProperty(exports, "DataSourceManager", { enumerable: true, get: function () { return data_sources_1.DataSourceManager; } });
var cache_manager_1 = require("./infrastructure/cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
Object.defineProperty(exports, "CacheBackend", { enumerable: true, get: function () { return cache_manager_1.CacheBackend; } });
Object.defineProperty(exports, "CloudflareKVBackend", { enumerable: true, get: function () { return cache_manager_1.CloudflareKVBackend; } });
Object.defineProperty(exports, "MemoryBackend", { enumerable: true, get: function () { return cache_manager_1.MemoryBackend; } });
Object.defineProperty(exports, "cached", { enumerable: true, get: function () { return cache_manager_1.cached; } });
Object.defineProperty(exports, "getCacheManager", { enumerable: true, get: function () { return cache_manager_1.getCacheManager; } });
Object.defineProperty(exports, "initializeCacheManager", { enumerable: true, get: function () { return cache_manager_1.initializeCacheManager; } });
// Routes - export with prefixes to avoid conflicts
var handler_1 = require("./routes/handler");
Object.defineProperty(exports, "RouteHandler", { enumerable: true, get: function () { return handler_1.RouteHandler; } });
var rbac_1 = require("./routes/rbac");
Object.defineProperty(exports, "RBACManager", { enumerable: true, get: function () { return rbac_1.RBACManager; } });
// Utilities
__exportStar(require("./utils"), exports);
// Middleware
__exportStar(require("./middleware"), exports);
// Configuration
__exportStar(require("./config"), exports);
// Constants
__exportStar(require("./constants"), exports);
// Errors
__exportStar(require("./errors"), exports);
// Validation
__exportStar(require("./validation"), exports);
// Services
__exportStar(require("./services"), exports);
//# sourceMappingURL=index.js.map