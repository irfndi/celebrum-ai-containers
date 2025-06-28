"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseQueries = exports.TradingStrategyQueries = exports.OpportunityQueries = exports.PositionQueries = exports.UserQueries = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("../schema/index.js");
// User operations
class UserQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByTelegramId(telegramId) {
        const result = await this.db
            .select()
            .from(index_js_1.users)
            .where((0, drizzle_orm_1.eq)(index_js_1.users.telegramId, telegramId))
            .limit(1);
        return result[0];
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(index_js_1.users)
            .where((0, drizzle_orm_1.eq)(index_js_1.users.id, id))
            .limit(1);
        return result[0];
    }
    async create(user) {
        const result = await this.db
            .insert(index_js_1.users)
            .values(user)
            .returning();
        return result[0];
    }
    async update(id, updates) {
        const result = await this.db
            .update(index_js_1.users)
            .set({
            ...updates,
            updatedAt: (0, drizzle_orm_1.sql) `(unixepoch())`,
        })
            .where((0, drizzle_orm_1.eq)(index_js_1.users.id, id))
            .returning();
        return result[0];
    }
    async delete(id) {
        const result = await this.db
            .delete(index_js_1.users)
            .where((0, drizzle_orm_1.eq)(index_js_1.users.id, id));
        // D1Result doesn't have changes property, use success flag instead
        return result.success;
    }
}
exports.UserQueries = UserQueries;
// Position operations
class PositionQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByUserId(userId, status) {
        let query = this.db.select().from(index_js_1.positions);
        if (status) {
            return await query.where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.positions.userId, userId), (0, drizzle_orm_1.eq)(index_js_1.positions.status, status)));
        }
        return await query.where((0, drizzle_orm_1.eq)(index_js_1.positions.userId, userId));
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(index_js_1.positions)
            .where((0, drizzle_orm_1.eq)(index_js_1.positions.id, id))
            .limit(1);
        return result[0];
    }
    async create(position) {
        const result = await this.db
            .insert(index_js_1.positions)
            .values(position)
            .returning();
        return result[0];
    }
    async update(id, updates) {
        const result = await this.db
            .update(index_js_1.positions)
            .set({
            ...updates,
            updatedAt: (0, drizzle_orm_1.sql) `(unixepoch())`,
        })
            .where((0, drizzle_orm_1.eq)(index_js_1.positions.id, id))
            .returning();
        return result[0];
    }
    async closePosition(id, exitPrice, pnl) {
        const result = await this.db
            .update(index_js_1.positions)
            .set({
            status: 'closed',
            exitPrice,
            pnl,
            closedAt: (0, drizzle_orm_1.sql) `(unixepoch())`,
            updatedAt: (0, drizzle_orm_1.sql) `(unixepoch())`,
        })
            .where((0, drizzle_orm_1.eq)(index_js_1.positions.id, id))
            .returning();
        return result[0];
    }
}
exports.PositionQueries = PositionQueries;
// Opportunity operations
class OpportunityQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findActive(type) {
        let baseQuery = this.db
            .select()
            .from(index_js_1.opportunities)
            .orderBy((0, drizzle_orm_1.desc)(index_js_1.opportunities.profitPercentage));
        if (type) {
            return await baseQuery.where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.opportunities.isActive, true), (0, drizzle_orm_1.eq)(index_js_1.opportunities.type, type)));
        }
        return await baseQuery.where((0, drizzle_orm_1.eq)(index_js_1.opportunities.isActive, true));
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(index_js_1.opportunities)
            .where((0, drizzle_orm_1.eq)(index_js_1.opportunities.id, id))
            .limit(1);
        return result[0];
    }
    async create(opportunity) {
        const result = await this.db
            .insert(index_js_1.opportunities)
            .values(opportunity)
            .returning();
        return result[0];
    }
    async deactivate(id) {
        const result = await this.db
            .update(index_js_1.opportunities)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(index_js_1.opportunities.id, id))
            .returning();
        return result[0];
    }
    async cleanup() {
        const result = await this.db
            .delete(index_js_1.opportunities)
            .where((0, drizzle_orm_1.sql) `expires_at < unixepoch()`);
        // D1Result uses meta.changes for affected rows count
        return result.meta.changes ?? 0;
    }
}
exports.OpportunityQueries = OpportunityQueries;
// Trading Strategy operations
class TradingStrategyQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByUserId(userId, isActive) {
        let query = this.db.select().from(index_js_1.tradingStrategies);
        if (isActive !== undefined) {
            return await query.where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_js_1.tradingStrategies.userId, userId), (0, drizzle_orm_1.eq)(index_js_1.tradingStrategies.isActive, isActive)));
        }
        return await query.where((0, drizzle_orm_1.eq)(index_js_1.tradingStrategies.userId, userId));
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(index_js_1.tradingStrategies)
            .where((0, drizzle_orm_1.eq)(index_js_1.tradingStrategies.id, id))
            .limit(1);
        return result[0];
    }
    async create(strategy) {
        const result = await this.db
            .insert(index_js_1.tradingStrategies)
            .values(strategy)
            .returning();
        return result[0];
    }
    async updatePerformance(id, performance) {
        const result = await this.db
            .update(index_js_1.tradingStrategies)
            .set({
            performance: performance,
            updatedAt: (0, drizzle_orm_1.sql) `(unixepoch())`,
        })
            .where((0, drizzle_orm_1.eq)(index_js_1.tradingStrategies.id, id))
            .returning();
        return result[0];
    }
    async toggle(id) {
        // First get the current state
        const current = await this.findById(id);
        if (!current)
            return undefined;
        const result = await this.db
            .update(index_js_1.tradingStrategies)
            .set({
            isActive: !current.isActive,
            updatedAt: (0, drizzle_orm_1.sql) `(unixepoch())`,
        })
            .where((0, drizzle_orm_1.eq)(index_js_1.tradingStrategies.id, id))
            .returning();
        return result[0];
    }
}
exports.TradingStrategyQueries = TradingStrategyQueries;
// Main query class that combines all operations
class DatabaseQueries {
    users;
    positions;
    opportunities;
    strategies;
    constructor(db) {
        this.users = new UserQueries(db);
        this.positions = new PositionQueries(db);
        this.opportunities = new OpportunityQueries(db);
        this.strategies = new TradingStrategyQueries(db);
    }
}
exports.DatabaseQueries = DatabaseQueries;
//# sourceMappingURL=queries.js.map