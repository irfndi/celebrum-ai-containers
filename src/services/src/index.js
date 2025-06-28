"use strict";
// @celebrum-ai/services - Main exports
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronHandler = exports.RBACService = exports.TradingConfigManager = exports.TechnicalStrategyManager = exports.FeatureFlagManager = exports.ArbitrageOpportunityManager = exports.ApiAccessManager = exports.ServiceRouter = void 0;
var router_1 = require("../../shared/src/middleware/router");
Object.defineProperty(exports, "ServiceRouter", { enumerable: true, get: function () { return router_1.ServiceRouter; } });
var api_access_manager_1 = require("../../shared/src/routes/api-access-manager");
Object.defineProperty(exports, "ApiAccessManager", { enumerable: true, get: function () { return api_access_manager_1.ApiAccessManager; } });
var arbitrage_opportunity_manager_1 = require("./opportunities/src/arbitrage-opportunity-manager");
Object.defineProperty(exports, "ArbitrageOpportunityManager", { enumerable: true, get: function () { return arbitrage_opportunity_manager_1.ArbitrageOpportunityManager; } });
var feature_flag_manager_1 = require("../../shared/src/config/feature-flag-manager");
Object.defineProperty(exports, "FeatureFlagManager", { enumerable: true, get: function () { return feature_flag_manager_1.FeatureFlagManager; } });
var technical_strategy_manager_1 = require("./opportunities/technical-strategy-manager");
Object.defineProperty(exports, "TechnicalStrategyManager", { enumerable: true, get: function () { return technical_strategy_manager_1.TechnicalStrategyManager; } });
var trading_config_manager_1 = require("./trading/src/trading-config-manager");
Object.defineProperty(exports, "TradingConfigManager", { enumerable: true, get: function () { return trading_config_manager_1.TradingConfigManager; } });
var rbac_1 = require("../../shared/src/middleware/rbac");
Object.defineProperty(exports, "RBACService", { enumerable: true, get: function () { return rbac_1.RBACService; } });
var cron_1 = require("../../shared/src/infrastructure/cron");
Object.defineProperty(exports, "CronHandler", { enumerable: true, get: function () { return cron_1.CronHandler; } });
//# sourceMappingURL=index.js.map