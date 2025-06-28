"use strict";
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
exports.VERSION = exports.ilike = exports.like = exports.asc = exports.desc = exports.sql = exports.not = exports.or = exports.and = exports.eq = exports.UserQueries = void 0;
// Export all database schemas and utilities
__exportStar(require("./schema/index.js"), exports);
__exportStar(require("./utils/connection.js"), exports);
__exportStar(require("./utils/queries.js"), exports);
var queries_js_1 = require("./utils/queries.js");
Object.defineProperty(exports, "UserQueries", { enumerable: true, get: function () { return queries_js_1.UserQueries; } });
// Re-export commonly used Drizzle types and functions
var drizzle_orm_1 = require("drizzle-orm");
Object.defineProperty(exports, "eq", { enumerable: true, get: function () { return drizzle_orm_1.eq; } });
Object.defineProperty(exports, "and", { enumerable: true, get: function () { return drizzle_orm_1.and; } });
Object.defineProperty(exports, "or", { enumerable: true, get: function () { return drizzle_orm_1.or; } });
Object.defineProperty(exports, "not", { enumerable: true, get: function () { return drizzle_orm_1.not; } });
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return drizzle_orm_1.sql; } });
Object.defineProperty(exports, "desc", { enumerable: true, get: function () { return drizzle_orm_1.desc; } });
Object.defineProperty(exports, "asc", { enumerable: true, get: function () { return drizzle_orm_1.asc; } });
Object.defineProperty(exports, "like", { enumerable: true, get: function () { return drizzle_orm_1.like; } });
Object.defineProperty(exports, "ilike", { enumerable: true, get: function () { return drizzle_orm_1.ilike; } });
// Package version
exports.VERSION = '0.1.0';
//# sourceMappingURL=index.js.map