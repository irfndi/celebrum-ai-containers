import { eq, and, desc, sql } from 'drizzle-orm';
import { users, positions, opportunities, tradingStrategies } from '../schema/index';
// User operations
export class UserQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByTelegramId(telegramId) {
        const result = await this.db
            .select()
            .from(users)
            .where(eq(users.telegramId, telegramId))
            .limit(1);
        return result[0];
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        return result[0];
    }
    async create(user) {
        const result = await this.db
            .insert(users)
            .values(user)
            .returning();
        return result[0];
    }
    async update(id, updates) {
        const result = await this.db
            .update(users)
            .set({
            ...updates,
            updatedAt: sql `(unixepoch())`,
        })
            .where(eq(users.id, id))
            .returning();
        return result[0];
    }
    async delete(id) {
        const result = await this.db
            .delete(users)
            .where(eq(users.id, id));
        // D1Result doesn't have changes property, use success flag instead
        return result.success;
    }
}
// Position operations
export class PositionQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByUserId(userId, status) {
        let query = this.db.select().from(positions);
        if (status) {
            return await query.where(and(eq(positions.userId, userId), eq(positions.status, status)));
        }
        return await query.where(eq(positions.userId, userId));
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(positions)
            .where(eq(positions.id, id))
            .limit(1);
        return result[0];
    }
    async create(position) {
        const result = await this.db
            .insert(positions)
            .values(position)
            .returning();
        return result[0];
    }
    async update(id, updates) {
        const result = await this.db
            .update(positions)
            .set({
            ...updates,
            updatedAt: sql `(unixepoch())`,
        })
            .where(eq(positions.id, id))
            .returning();
        return result[0];
    }
    async closePosition(id, exitPrice, pnl) {
        const result = await this.db
            .update(positions)
            .set({
            status: 'closed',
            exitPrice,
            pnl,
            closedAt: sql `(unixepoch())`,
            updatedAt: sql `(unixepoch())`,
        })
            .where(eq(positions.id, id))
            .returning();
        return result[0];
    }
}
// Opportunity operations
export class OpportunityQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findActive(type) {
        let baseQuery = this.db
            .select()
            .from(opportunities)
            .orderBy(desc(opportunities.profitPercentage));
        if (type) {
            return await baseQuery.where(and(eq(opportunities.isActive, true), eq(opportunities.type, type)));
        }
        return await baseQuery.where(eq(opportunities.isActive, true));
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(opportunities)
            .where(eq(opportunities.id, id))
            .limit(1);
        return result[0];
    }
    async create(opportunity) {
        const result = await this.db
            .insert(opportunities)
            .values(opportunity)
            .returning();
        return result[0];
    }
    async deactivate(id) {
        const result = await this.db
            .update(opportunities)
            .set({ isActive: false })
            .where(eq(opportunities.id, id))
            .returning();
        return result[0];
    }
    async cleanup() {
        const result = await this.db
            .delete(opportunities)
            .where(sql `expires_at < unixepoch()`);
        // D1Result uses meta.changes for affected rows count
        return result.meta.changes ?? 0;
    }
}
// Trading Strategy operations
export class TradingStrategyQueries {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByUserId(userId, isActive) {
        let query = this.db.select().from(tradingStrategies);
        if (isActive !== undefined) {
            return await query.where(and(eq(tradingStrategies.userId, userId), eq(tradingStrategies.isActive, isActive)));
        }
        return await query.where(eq(tradingStrategies.userId, userId));
    }
    async findById(id) {
        const result = await this.db
            .select()
            .from(tradingStrategies)
            .where(eq(tradingStrategies.id, id))
            .limit(1);
        return result[0];
    }
    async create(strategy) {
        const result = await this.db
            .insert(tradingStrategies)
            .values(strategy)
            .returning();
        return result[0];
    }
    async updatePerformance(id, performance) {
        const result = await this.db
            .update(tradingStrategies)
            .set({
            performance: performance,
            updatedAt: sql `(unixepoch())`,
        })
            .where(eq(tradingStrategies.id, id))
            .returning();
        return result[0];
    }
    async toggle(id) {
        // First get the current state
        const current = await this.findById(id);
        if (!current)
            return undefined;
        const result = await this.db
            .update(tradingStrategies)
            .set({
            isActive: !current.isActive,
            updatedAt: sql `(unixepoch())`,
        })
            .where(eq(tradingStrategies.id, id))
            .returning();
        return result[0];
    }
}
// Main query class that combines all operations
export class DatabaseQueries {
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
//# sourceMappingURL=queries.js.map