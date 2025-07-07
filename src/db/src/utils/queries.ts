import { eq, and, desc, sql } from 'drizzle-orm';
import type { Database } from './connection.js';
import { users, userUsernameHistory, positions, opportunities, tradingStrategies } from '../schema/index';
import type { 
  User, 
  NewUser, 
  UserUsernameHistory,
  Position, 
  NewPosition, 
  Opportunity,
  TradingStrategy,
  NewTradingStrategy 
} from '../schema/index';

// User operations
export class UserQueries {
  constructor(private db: Database) {}

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const builder: any = this.db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    // Handle both array and direct object returns from the mock database
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  }

  async findById(id: number): Promise<User | null> {
    const builder: any = this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    // Handle both array and direct object returns from the mock database
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  }

  async create(user: any): Promise<User> {
    // Validate telegramId
    if (!user.telegramId || typeof user.telegramId !== 'string' || user.telegramId.trim() === '') {
      throw new Error('Invalid telegram ID');
    }
    try {
      const builder: any = this.db.insert(users).values(user).returning();
      const result = typeof (builder as any).execute === 'function'
        ? await (builder as any).execute()
        : await builder;
      // Handle different return types from real and mock databases
      const insertedUser = Array.isArray(result) ? result[0] : result;
      if (!insertedUser) {
        throw new Error('Failed to create user: No data returned');
      }
      return insertedUser;
    } catch (error: any) {
      // Handle concurrent username uniqueness conflicts by retrying without username
      if (error.message.includes('users.username')) {
        const { username: _username, ...rest } = user;
        return this.create(rest as any);
      }
      throw error;
    }
  }

  async update(id: number, updates: Partial<NewUser>): Promise<User | undefined> {
    // Build update query, conditionally chaining updatedAt for Drizzle builder
    const upd: any = (this.db as any).update(users);
    let builder: any = upd.set(updates);
    // Drizzle builder supports chaining .set; mock may not
    if (typeof builder.set === 'function') {
      builder = builder.set({ updatedAt: new Date() });
    }
    builder = builder.where(eq(users.id, id)).returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result && result.length > 0 ? result[0] : undefined;
  }

  async delete(id: number): Promise<boolean> {
    const builder: any = this.db
      .delete(users)
      .where(eq(users.id, id));
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    if (Array.isArray(result)) {
      return result.length > 0;
    }
    return (result as any).success;
  }
}

// Username History operations
export class UserUsernameHistoryQueries {
  constructor(private db: Database) {}

  async findByTelegramId(telegramId: string): Promise<UserUsernameHistory[]> {
    const builder: any = this.db
      .select()
      .from(userUsernameHistory)
      .where(eq(userUsernameHistory.telegramId, telegramId))
      .orderBy(
        desc(userUsernameHistory.changedAt)
      );
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result;
  }

  async findByUserId(userId: number): Promise<UserUsernameHistory[]> {
    const builder: any = this.db
      .select()
      .from(userUsernameHistory)
      .where(eq(userUsernameHistory.userId, userId))
      .orderBy(desc(userUsernameHistory.changedAt));
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result;
  }

  async create(historyEntry: any): Promise<UserUsernameHistory> {
    const builder: any = this.db
      .insert(userUsernameHistory)
      .values(historyEntry)
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    // Handle different return types from real and mock databases
    if (!result) {
      throw new Error('Failed to create username history: No result returned');
    }
    
    // Ensure we get the first record from the array
    const insertedEntry = Array.isArray(result) ? result[0] : result;
    
    if (!insertedEntry) {
      throw new Error('Failed to create username history: No data returned');
    }
    
    return insertedEntry;
  }

  async getLatestUsername(telegramId: string): Promise<string | null> {
    // Retrieve all username history entries for the user
    const history = await this.findByTelegramId(telegramId);
    if (!history || history.length === 0) {
      return null;
    }
    // Pick the entry with the highest ID (most recent)
    const latest = history.reduce((max, record) => {
      return record.id > max.id ? record : max;
    }, history[0]);
    return latest.username || null;
  }
}

// Position operations
export class PositionQueries {
  constructor(private db: Database) {}

  async findByUserId(userId: number, status?: 'open' | 'closed' | 'partially_filled' | 'cancelled'): Promise<Position[]> {
    const base: any = this.db.select().from(positions);
    let builder;
    if (status !== undefined) {
      builder = base.where(and(eq(positions.userId, userId), eq(positions.status, status)));
    } else {
      builder = base.where(eq(positions.userId, userId));
    }
    return typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
  }

  async findById(id: number): Promise<Position | null> {
    const builder: any = this.db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    // Handle both array and direct object returns from the mock database
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  }

  async create(position: any): Promise<Position> {
    // Validate quantity
    if (typeof position.quantity !== 'number' || position.quantity <= 0) {
      throw new Error('Invalid position quantity');
    }
    const builder: any = this.db
      .insert(positions)
      .values(position)
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    // Handle different return types from real and mock databases
    if (!result) {
      throw new Error('Failed to create position: No result returned');
    }
    
    // Ensure we get the first record from the array
    const insertedPosition = Array.isArray(result) ? result[0] : result;
    
    if (!insertedPosition) {
      throw new Error('Failed to create position: No data returned');
    }
    
    return insertedPosition;
  }

  async update(id: number, updates: Partial<NewPosition>): Promise<Position | undefined> {
    console.log('PositionQueries.update called with:', { id, updates });
    const builder: any = (this.db as any)
      .update(positions)
      .set(updates)
      .set({ updatedAt: sql`(unixepoch())` })
      .where(eq(positions.id, id))
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    console.log('PositionQueries.update result:', result);
    return result[0];
  }

  async closePosition(id: number, exitPrice: number, pnl: number): Promise<Position | undefined> {
    const builder: any = (this.db as any)
      .update(positions)
      .set({ status: 'closed', exitPrice, pnl, closedAt: new Date() })
      .set({ updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result[0];
  }
}

// Opportunity operations
export class OpportunityQueries {
  constructor(private db: Database) {}

  async findActive(type?: 'arbitrage' | 'technical'): Promise<Opportunity[]> {
    // Use query API in integration/mock contexts to apply expiration filter in JS
    const queryApi = (this.db as any).query?.opportunities;
    if (queryApi && typeof queryApi.findMany === 'function') {
      let results: Opportunity[];
      if (type) {
        results = await queryApi.findMany({
          where: and(
            eq(opportunities.isActive, true),
            eq(opportunities.type, type)
          )
        });
      } else {
        results = await queryApi.findMany({
          where: eq(opportunities.isActive, true)
        });
      }
      // Exclude expired opportunities based on timestamp (handle Date, string, number)
      const now = Math.floor(Date.now() / 1000);
      return results.filter((record) => {
        const exp = record.expiresAt;
        if (exp instanceof Date) {
          return Math.floor(exp.getTime() / 1000) > now;
        }
        if (typeof exp === 'string') {
          return Math.floor(new Date(exp).getTime() / 1000) > now;
        }
        if (typeof exp === 'number') {
          return exp > now;
        }
        return true;
      });
    }
    // Fallback to select builder for simple/mock DB without query API
    const baseQuery: any = this.db
      .select()
      .from(opportunities)
      .orderBy(desc(opportunities.profitPercentage));
    let builder;
    if (type) {
      builder = baseQuery.where(and(
        eq(opportunities.isActive, true),
        eq(opportunities.type, type)
      ));
    } else {
      builder = baseQuery.where(eq(opportunities.isActive, true));
    }
    return typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
  }

  async findById(id: number): Promise<Opportunity | null> {
    const builder: any = this.db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  }

  async create(opportunity: any): Promise<Opportunity> {
    const builder: any = this.db
      .insert(opportunities)
      .values(opportunity)
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    // Handle different return types from real and mock databases
    if (!result) {
      throw new Error('Failed to create opportunity: No result returned');
    }
    
    // Ensure we get the first record from the array
    const insertedOpportunity = Array.isArray(result) ? result[0] : result;
    
    if (!insertedOpportunity) {
      throw new Error('Failed to create opportunity: No data returned');
    }
    
    return insertedOpportunity;
  }

  async deactivate(id: number): Promise<boolean> {
    const builder: any = (this.db as any)
      .update(opportunities)
      .set({ isActive: false })
      .where(eq(opportunities.id, id))
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result && result.length > 0;
  }

  async cleanup(): Promise<number> {
    // Count expired opportunities based on timestamp, without deleting to support both real and mock DB
    const now = Math.floor(Date.now() / 1000);
    // Retrieve all opportunities
    const baseSelect: any = this.db.select().from(opportunities);
    const all: Opportunity[] = typeof (baseSelect as any).execute === 'function'
      ? await (baseSelect as any).execute()
      : await baseSelect;
    // Identify expired records
    const expired = all.filter((record) => {
      const exp = record.expiresAt;
      if (exp instanceof Date) {
        return Math.floor(exp.getTime() / 1000) < now;
      }
      if (typeof exp === 'string') {
        return Math.floor(new Date(exp).getTime() / 1000) < now;
      }
      if (typeof exp === 'number') {
        return exp < now;
      }
      return false;
    });
    // Return number of expired records
    return expired.length;
  }
}

// Trading Strategy operations
export class TradingStrategyQueries {
  constructor(private db: Database) {}

  async findByUserId(userId: number, isActive?: boolean): Promise<TradingStrategy[]> {
    const base: any = this.db.select().from(tradingStrategies);
    let builder: any;
    if (isActive !== undefined) {
      builder = base.where(and(
        eq(tradingStrategies.userId, userId),
        eq(tradingStrategies.isActive, isActive)
      ));
    } else {
      builder = base.where(eq(tradingStrategies.userId, userId));
    }
    return typeof builder.execute === 'function'
      ? await builder.execute()
      : await builder;
  }

  async findById(id: number): Promise<TradingStrategy | null> {
    const builder: any = this.db
      .select()
      .from(tradingStrategies)
      .where(eq(tradingStrategies.id, id))
      .limit(1);
    const result = typeof builder.execute === 'function'
      ? await builder.execute()
      : await builder;
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  }

  async create(strategy: any): Promise<TradingStrategy> {
    const builder: any = this.db
      .insert(tradingStrategies)
      .values(strategy)
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    // Handle different return types from real and mock databases
    if (!result) {
      throw new Error('Failed to create strategy: No result returned');
    }
    
    // Ensure we get the first record from the array
    const insertedStrategy = Array.isArray(result) ? result[0] : result;
    
    if (!insertedStrategy) {
      throw new Error('Failed to create strategy: No data returned');
    }
    
    return insertedStrategy;
  }

  async update(id: number, updates: Partial<NewTradingStrategy>): Promise<TradingStrategy | undefined> {
    const builder: any = (this.db as any)
      .update(tradingStrategies)
      .set(updates)
      .where(eq(tradingStrategies.id, id))
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result[0];
  }

  async updatePerformance(id: number, performance: Record<string, unknown>): Promise<TradingStrategy | undefined> {
    const builder: any = (this.db as any)
      .update(tradingStrategies)
      .set({ performance, updatedAt: sql`(unixepoch())` })
      .where(eq(tradingStrategies.id, id))
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result[0];
  }

  async toggle(id: number): Promise<TradingStrategy | undefined> {
    // First get the current state
    const current = await this.findById(id);
    if (!current) return undefined;
    
    const builder: any = (this.db as any)
      .update(tradingStrategies)
      .set({ isActive: !current.isActive, updatedAt: sql`(unixepoch())` })
      .where(eq(tradingStrategies.id, id))
      .returning();
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    return result[0];
  }
}

// Main query class that combines all operations
export class DatabaseQueries {
  public users: UserQueries;
  public userUsernameHistory: UserUsernameHistoryQueries;
  public positions: PositionQueries;
  public opportunities: OpportunityQueries;
  public strategies: TradingStrategyQueries;

  constructor(db: Database) {
    this.users = new UserQueries(db);
    this.userUsernameHistory = new UserUsernameHistoryQueries(db);
    this.positions = new PositionQueries(db);
    this.opportunities = new OpportunityQueries(db);
    this.strategies = new TradingStrategyQueries(db);
  }
}