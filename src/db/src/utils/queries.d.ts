import type { Database } from './connection.js';
import type { User, NewUser, Position, NewPosition, Opportunity, NewOpportunity, TradingStrategy, NewTradingStrategy } from '../schema/index.js';
export declare class UserQueries {
    private db;
    constructor(db: Database);
    findByTelegramId(telegramId: string): Promise<User | undefined>;
    findById(id: number): Promise<User | undefined>;
    create(user: NewUser): Promise<User>;
    update(id: number, updates: Partial<NewUser>): Promise<User | undefined>;
    delete(id: number): Promise<boolean>;
}
export declare class PositionQueries {
    private db;
    constructor(db: Database);
    findByUserId(userId: number, status?: 'open' | 'closed' | 'partially_filled' | 'cancelled'): Promise<Position[]>;
    findById(id: number): Promise<Position | undefined>;
    create(position: NewPosition): Promise<Position>;
    update(id: number, updates: Partial<NewPosition>): Promise<Position | undefined>;
    closePosition(id: number, exitPrice: number, pnl: number): Promise<Position | undefined>;
}
export declare class OpportunityQueries {
    private db;
    constructor(db: Database);
    findActive(type?: 'arbitrage' | 'technical'): Promise<Opportunity[]>;
    findById(id: number): Promise<Opportunity | undefined>;
    create(opportunity: NewOpportunity): Promise<Opportunity>;
    deactivate(id: number): Promise<Opportunity | undefined>;
    cleanup(): Promise<number>;
}
export declare class TradingStrategyQueries {
    private db;
    constructor(db: Database);
    findByUserId(userId: number, isActive?: boolean): Promise<TradingStrategy[]>;
    findById(id: number): Promise<TradingStrategy | undefined>;
    create(strategy: NewTradingStrategy): Promise<TradingStrategy>;
    updatePerformance(id: number, performance: Record<string, unknown>): Promise<TradingStrategy | undefined>;
    toggle(id: number): Promise<TradingStrategy | undefined>;
}
export declare class DatabaseQueries {
    users: UserQueries;
    positions: PositionQueries;
    opportunities: OpportunityQueries;
    strategies: TradingStrategyQueries;
    constructor(db: Database);
}
//# sourceMappingURL=queries.d.ts.map