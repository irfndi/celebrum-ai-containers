import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, sql } from 'drizzle-orm';
import { users, userUsernameHistory, positions, opportunities, tradingStrategies } from '../schema/index';
import type { 
  User, 
  NewUser, 
  UserUsernameHistory,
  NewUserUsernameHistory,
  Position, 
  NewPosition,
  Opportunity,
  NewOpportunity,
  TradingStrategy,
  NewTradingStrategy 
} from '../schema/index';
import type { Database } from './connection';

// Use the Database type from connection.ts for consistency

// User operations
export class UserQueries {
  constructor(private db: Database) {}

  async findByTelegramId(telegramId: string | number): Promise<User | null> {
    try {
      // Keep as string for consistency with schema
      const telegramIdStr = telegramId.toString();
      
      // Use Drizzle ORM with the correct schema - it will handle D1 compatibility and JSON parsing
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramIdStr))
        .get();
      
      return result || null;
    } catch (error) {
      console.error(`Error finding user by Telegram ID ${telegramId}:`, error);
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      // Use Drizzle ORM with the correct schema - it will handle D1 compatibility and JSON parsing
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .get();
      
      return result || null;
    } catch (error) {
      console.error(`Error finding user by ID ${id}:`, error);
      return null;
    }
  }

  async create(user: NewUser): Promise<User> {
    // Validate telegramId
    if (!user.telegramId || (typeof user.telegramId !== 'string' && typeof user.telegramId !== 'number')) {
      throw new Error('Invalid telegram ID');
    }
    
    const newId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Prepare user data for D1 compatibility
      // JSON fields are automatically handled by Drizzle ORM when using mode: 'json'
      const userData: NewUser = {
        id: newId,
        telegramId: user.telegramId.toString(), // Keep as string for consistency
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        username: user.username || null,
        languageCode: user.languageCode || null,
        email: user.email || null,
        role: user.role || 'free',
        status: user.status || 'active',
        settings: user.settings || {},
        apiLimits: user.apiLimits || {},
        tradingPreferences: user.tradingPreferences || {},
        accountBalance: user.accountBalance || '0.00',
        betaExpiresAt: user.betaExpiresAt ? (user.betaExpiresAt instanceof Date ? user.betaExpiresAt : new Date(user.betaExpiresAt)) : null,
      };
      
      await this.db.insert(users).values(userData);
      
      const createdUser = await this.findById(newId);

      if (!createdUser) {
        throw new Error('Failed to create user: user not found after insert');
      }
      
      // Return the created user directly - telegramId is already a string
      return createdUser;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async update(id: string, updates: Partial<NewUser>): Promise<User | undefined> {
    try {
      // Prepare updates for D1 compatibility
      // JSON fields are automatically handled by Drizzle ORM when using mode: 'json'
      const updateData: any = {};
      
      // Only include fields that exist in the schema
      if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
      if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.languageCode !== undefined) updateData.languageCode = updates.languageCode;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.accountBalance !== undefined) updateData.accountBalance = updates.accountBalance;
      if (updates.betaExpiresAt !== undefined) updateData.betaExpiresAt = updates.betaExpiresAt;
      
      // Handle JSON fields - Drizzle ORM automatically handles serialization
      if (updates.settings !== undefined) updateData.settings = updates.settings;
      if (updates.apiLimits !== undefined) updateData.apiLimits = updates.apiLimits;
      if (updates.tradingPreferences !== undefined) updateData.tradingPreferences = updates.tradingPreferences;
      
      // Set updated timestamp
      updateData.updatedAt = new Date();
      
      const result = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
        
      if (!result || result.length === 0) return undefined;
      
      const updatedUser = result[0];
      
      // Convert telegramId back to string for API compatibility
      // JSON fields are automatically parsed by Drizzle ORM when using mode: 'json'
      return {
        ...updatedUser,
        telegramId: updatedUser.telegramId.toString(),
      };
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // First check if the user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return false; // User doesn't exist, deletion "failed"
      }
      
      // Perform the deletion
      await this.db
        .delete(users)
        .where(eq(users.id, id));
      
      // If we reach here without error, deletion was successful
      return true;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
  }
}

// Username History operations
export class UserUsernameHistoryQueries {
  constructor(private db: Database) {}

  async findByTelegramId(telegramId: string): Promise<UserUsernameHistory[]> {
    // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
    return this.db
      .select()
      .from(userUsernameHistory)
      .where(eq(userUsernameHistory.telegramId, telegramId))
      .orderBy(desc(userUsernameHistory.changedAt));
  }

  async findByUserId(userId: string): Promise<UserUsernameHistory[]> {
    // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
    return this.db
      .select()
      .from(userUsernameHistory)
      .where(eq(userUsernameHistory.userId, userId))
      .orderBy(desc(userUsernameHistory.changedAt));
  }

  async create(historyEntry: NewUserUsernameHistory): Promise<UserUsernameHistory> {
    try {
      // Prepare history entry data for D1 compatibility
      const historyData: NewUserUsernameHistory = {
        userId: historyEntry.userId,
        telegramId: historyEntry.telegramId,
        username: historyEntry.username || null,
        changeSource: historyEntry.changeSource || 'manual_correction',
        changedAt: historyEntry.changedAt || new Date(),
      };
      
      const result = await this.db
        .insert(userUsernameHistory)
        .values(historyData)
        .returning();
      
      if (!result || (Array.isArray(result) && result.length === 0)) {
        throw new Error('Failed to create username history: No data returned');
      }
      
      return Array.isArray(result) ? result[0] : result;
    } catch (error: any) {
      console.error('Error creating username history:', error);
      throw new Error(`Failed to create username history: ${error.message}`);
    }
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

  async findByUserId(userId: string, status?: 'open' | 'closed' | 'partially_filled' | 'cancelled'): Promise<Position[]> {
    // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
    if (status !== undefined) {
      return this.db
        .select()
        .from(positions)
        .where(and(eq(positions.userId, userId), eq(positions.status, status)));
    } else {
      return this.db
        .select()
        .from(positions)
        .where(eq(positions.userId, userId));
    }
  }

  async findById(id: string): Promise<Position | null> {
    try {
      // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
      const result = await this.db
        .select()
        .from(positions)
        .where(eq(positions.id, id))
        .get();
      
      return result || null;
    } catch (error) {
      // Handle JSON parsing errors gracefully
      console.error(`Error finding position by ID ${id}:`, error);
      return null;
    }
  }

  async create(position: NewPosition): Promise<Position> {
    // Validate quantity (schema uses 'quantity')
    if (typeof position.quantity !== 'number' || position.quantity <= 0) {
      throw new Error('Invalid position quantity');
    }
    
    // Prepare position data for D1 compatibility - Drizzle handles JSON serialization
    const positionData: NewPosition = {
      userId: position.userId,
      symbol: position.symbol,
      type: position.type,
      strategy: position.strategy,
      status: position.status || 'open',
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice: position.exitPrice || null,
      stopLoss: position.stopLoss || null,
      takeProfit: position.takeProfit || null,
      leverage: position.leverage || 1,
      fees: position.fees || 0,
      pnl: position.pnl || 0,
      exchangeId: position.exchangeId,
      metadata: position.metadata || {},
    };
    
    const result = await this.db
      .insert(positions)
      .values(positionData)
      .returning();
    
    if (!result || (Array.isArray(result) && result.length === 0)) {
      throw new Error('Failed to create position: No data returned');
    }
    
    return Array.isArray(result) ? result[0] : result;
  }

  async update(id: string, updates: Partial<NewPosition>): Promise<Position> {
    // First get the current position
    const currentPosition = await this.findById(id);
    if (!currentPosition) {
      throw new Error(`Position with ID ${id} not found`);
    }
    
    // Prepare update data with proper types for D1 compatibility - Drizzle handles JSON
    const updateData: Partial<NewPosition> = {};
    
    // Only include fields that exist in the schema and handle types properly
    if (updates.symbol !== undefined) updateData.symbol = updates.symbol;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.strategy !== undefined) updateData.strategy = updates.strategy;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.entryPrice !== undefined) updateData.entryPrice = updates.entryPrice;
    if (updates.exitPrice !== undefined) updateData.exitPrice = updates.exitPrice;
    if (updates.stopLoss !== undefined) updateData.stopLoss = updates.stopLoss;
    if (updates.takeProfit !== undefined) updateData.takeProfit = updates.takeProfit;
    if (updates.leverage !== undefined) updateData.leverage = updates.leverage;
    if (updates.fees !== undefined) updateData.fees = updates.fees;
    if (updates.pnl !== undefined) updateData.pnl = updates.pnl;
    if (updates.exchangeId !== undefined) updateData.exchangeId = updates.exchangeId;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    
    // Set updated timestamp
    updateData.updatedAt = new Date();
    
    const result = await this.db
      .update(positions)
      .set(updateData)
      .where(eq(positions.id, id))
      .returning();
    
    const updatedPosition = result[0];
    if (!updatedPosition) {
      throw new Error(`Failed to update position with ID ${id}`);
    }
    
    return updatedPosition;
  }

  async closePosition(id: string, exitPrice: number, pnl: number): Promise<Position> {
    const now = new Date();
    
    const result = await this.db
      .update(positions)
      .set({ 
        status: 'closed', 
        exitPrice: exitPrice,
        pnl, 
        closedAt: now,
        updatedAt: now 
      })
      .where(eq(positions.id, id))
      .returning();
    
    const updatedPosition = result[0];
    if (!updatedPosition) {
      throw new Error(`Position with ID ${id} not found after closing`);
    }
    
    return updatedPosition;
  }
}

// Opportunity operations
export class OpportunityQueries {
  constructor(private db: Database) {}

  async findActive(type?: 'arbitrage' | 'technical'): Promise<Opportunity[]> {
    // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
    const now = new Date();
    
    if (type) {
      return this.db
        .select()
        .from(opportunities)
        .where(and(
          eq(opportunities.type, type),
          eq(opportunities.isActive, true),
          sql`${opportunities.expiresAt} > ${Math.floor(now.getTime() / 1000)}`
        ))
        .orderBy(desc(opportunities.profitPercentage));
    } else {
      return this.db
        .select()
        .from(opportunities)
        .where(and(
          eq(opportunities.isActive, true),
          sql`${opportunities.expiresAt} > ${Math.floor(now.getTime() / 1000)}`
        ))
        .orderBy(desc(opportunities.profitPercentage));
    }
  }

  async findById(id: string): Promise<Opportunity | null> {
    try {
      // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
      const result = await this.db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, id))
        .get();
      
      return result || null;
    } catch (error) {
      // Handle JSON parsing errors gracefully
      console.error(`Error finding opportunity by ID ${id}:`, error);
      return null;
    }
  }

  async create(opportunity: NewOpportunity): Promise<Opportunity> {
    // Prepare opportunity data for D1 compatibility
    const opportunityData: NewOpportunity = {
      type: opportunity.type,
      symbol: opportunity.symbol,
      exchange1: opportunity.exchange1 || null,
      exchange2: opportunity.exchange2 || null,
      price1: opportunity.price1 || null,
      price2: opportunity.price2 || null,
      profitPercentage: opportunity.profitPercentage,
      confidence: opportunity.confidence,
      isActive: opportunity.isActive !== undefined ? opportunity.isActive : true,
      expiresAt: opportunity.expiresAt 
        ? (opportunity.expiresAt instanceof Date 
          ? opportunity.expiresAt
          : new Date(opportunity.expiresAt))
        : new Date(Date.now() + 3600 * 1000), // 1 hour default
    };
    
    const result = await this.db
      .insert(opportunities)
      .values(opportunityData)
      .returning();
    
    if (!result || (Array.isArray(result) && result.length === 0)) {
      throw new Error('Failed to create opportunity: No data returned');
    }
    
    return Array.isArray(result) ? result[0] : result;
  }

  async deactivate(id: string): Promise<boolean> {
    // Deactivate the opportunity by setting isActive to false
    const result = await this.db
      .update(opportunities)
      .set({ 
        isActive: false,
        expiresAt: new Date() // Expire it immediately
      })
      .where(eq(opportunities.id, id))
      .returning();
      
    return result && result.length > 0;
  }

  async cleanup(): Promise<number> {
    // Count expired opportunities based on expiresAt for D1 compatibility
    const now = Math.floor(Date.now() / 1000);
    
    // Use Drizzle ORM to get all opportunities
    const all = await this.db.select().from(opportunities);
    
    // Identify expired records using the correct field name
    const expired = all.filter((record) => {
      const exp = record.expiresAt;
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

  async findByUserId(userId: string, isActive?: boolean): Promise<TradingStrategy[]> {
    // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
    if (isActive !== undefined) {
      return this.db
        .select()
        .from(tradingStrategies)
        .where(and(
          eq(tradingStrategies.userId, userId),
          eq(tradingStrategies.isActive, isActive)
        ));
    } else {
      return this.db
        .select()
        .from(tradingStrategies)
        .where(eq(tradingStrategies.userId, userId));
    }
  }

  async findById(id: string): Promise<TradingStrategy | null> {
    // Use Drizzle ORM with the correct schema - it will handle D1 compatibility
    const result = await this.db
      .select()
      .from(tradingStrategies)
      .where(eq(tradingStrategies.id, id))
      .get();
    
    return result || null;
  }

  async create(strategy: NewTradingStrategy): Promise<TradingStrategy> {
    // Prepare strategy data for D1 compatibility - Drizzle handles JSON serialization
    const strategyData: NewTradingStrategy = {
      userId: strategy.userId,
      name: strategy.name,
      type: strategy.type,
      isActive: strategy.isActive !== undefined ? strategy.isActive : true,
      settings: strategy.settings || {},
      performance: strategy.performance || {},
    };
    
    const result = await this.db
      .insert(tradingStrategies)
      .values(strategyData)
      .returning();
    
    if (!result || (Array.isArray(result) && result.length === 0)) {
      throw new Error('Failed to create strategy: No data returned');
    }
    
    return Array.isArray(result) ? result[0] : result;
  }

  async update(id: string, updates: Partial<NewTradingStrategy>): Promise<TradingStrategy | undefined> {
    // Prepare updates - Drizzle handles JSON serialization automatically
    const updateData: Partial<NewTradingStrategy> = {};
    
    // Only include fields that exist in the schema
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.performance !== undefined) updateData.performance = updates.performance;
    
    // Set updated timestamp
    updateData.updatedAt = new Date();
    
    const result = await this.db
      .update(tradingStrategies)
      .set(updateData)
      .where(eq(tradingStrategies.id, id))
      .returning();
      
    if (!result || result.length === 0) return undefined;
    
    return result[0];
  }

  async updatePerformance(id: string, performance: Record<string, unknown>): Promise<TradingStrategy | undefined> {
    const result = await this.db
      .update(tradingStrategies)
      .set({ 
        performance: performance, 
        updatedAt: new Date()
      })
      .where(eq(tradingStrategies.id, id))
      .returning();
      
    if (!result || result.length === 0) return undefined;
    
    return result[0];
  }

  async toggle(id: string): Promise<TradingStrategy | undefined> {
    // First get the current state
    const current = await this.findById(id);
    if (!current) return undefined;
    
    const result = await this.db
      .update(tradingStrategies)
      .set({ 
        isActive: !current.isActive, 
        updatedAt: new Date()
      })
      .where(eq(tradingStrategies.id, id))
      .returning();
      
    if (!result || result.length === 0) return undefined;
    
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