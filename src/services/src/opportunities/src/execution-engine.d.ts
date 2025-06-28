import type { Env } from '@celebrum-ai/shared';
import type { ScoredOpportunity } from './opportunity-scorer';
export interface ExecutionResult {
    opportunityId: string;
    status: 'success' | 'partial' | 'failed';
    executedVolume: number;
    actualProfit: number;
    fees: number;
    executionTime: number;
    error?: string;
    transactions: Transaction[];
}
export interface Transaction {
    id: string;
    exchange: string;
    type: 'buy' | 'sell';
    symbol: string;
    amount: number;
    price: number;
    fee: number;
    timestamp: string;
    status: 'pending' | 'completed' | 'failed';
}
export interface ExecutionConfig {
    maxSlippage: number;
    maxExecutionTime: number;
    minProfitThreshold: number;
    dryRun: boolean;
}
export declare class ExecutionEngine {
    private env;
    private config;
    private defaultConfig;
    constructor(env: Env, config?: Partial<ExecutionConfig>);
    executeOpportunity(opportunity: ScoredOpportunity): Promise<ExecutionResult>;
    private validateOpportunity;
    private executeBuyOrder;
    private executeSellOrder;
    private calculateActualProfit;
    private determineExecutionStatus;
    private generateTransactionId;
    updateConfig(newConfig: Partial<ExecutionConfig>): void;
    enableLiveTrading(): void;
    enableDryRun(): void;
}
//# sourceMappingURL=execution-engine.d.ts.map