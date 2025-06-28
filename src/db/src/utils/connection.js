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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDb = createDb;
exports.getDatabase = getDatabase;
exports.withTransaction = withTransaction;
const d1_1 = require("drizzle-orm/d1");
const schema = __importStar(require("../schema/index.js"));
/**
 * Create database connection for Cloudflare Worker
 * @param d1Database - D1Database instance from Cloudflare Worker env
 * @returns Drizzle database instance with schema
 */
function createDb(d1Database) {
    return (0, d1_1.drizzle)(d1Database, { schema });
}
/**
 * Database connection factory for different environments
 * @param env - Cloudflare Worker environment
 * @returns Database instance
 */
function getDatabase(env) {
    return createDb(env.ArbEdgeD1);
}
/**
 * Type-safe database transaction wrapper
 * @param db - Database instance
 * @param fn - Transaction function
 * @returns Promise with transaction result
 */
async function withTransaction(db, fn) {
    return await db.transaction(fn);
}
//# sourceMappingURL=connection.js.map