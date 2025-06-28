import type { Env } from '../types';
/**
 * Handles scheduled cron events.
 */
export declare class CronHandler {
    private env;
    constructor(env: Env);
    /**
     * Main handler for scheduled events.
     * @param event The scheduled event.
     * @param ctx The execution context.
     */
    handle(event: {
        cron: string;
        scheduledTime: number;
    }, ctx: {
        waitUntil: (promise: Promise<unknown>) => void;
    }): Promise<void>;
    /**
     * Handles tasks that run every 5 minutes.
     */
    private handleHighFrequencyTasks;
    /**
     * Handles tasks that run every 30 minutes.
     */
    private handleMediumFrequencyTasks;
    /**
     * Handles tasks that run every 6 hours.
     */
    private handleLowFrequencyTasks;
}
//# sourceMappingURL=cron.d.ts.map