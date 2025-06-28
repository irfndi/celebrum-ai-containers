import { Hono } from 'hono';
import type { Env } from '../types';
/**
 * ServiceRouter handles routing requests to appropriate services
 * based on URL patterns and service availability
 */
export declare class ServiceRouter {
    /**
     * Handle API requests
     * Routes to core API service
     */
    apiHandler(): Hono<{
        Bindings: Env;
    }, import("hono/types").BlankSchema, "/">;
    /**
     * Handle Telegram bot webhook requests
     */
    telegramBotHandler(handleTelegramUpdate?: (update: unknown, context: unknown) => Promise<Response>): Hono<{
        Bindings: Env;
    }, import("hono/types").BlankSchema, "/">;
    /**
     * Handle Discord bot webhook requests
     */
    discordBotHandler(): Hono<{
        Bindings: Env;
    }, import("hono/types").BlankSchema, "/">;
    /**
     * Handle admin panel requests
     */
    adminHandler(): Hono<{
        Bindings: Env;
    }, import("hono/types").BlankSchema, "/">;
    /**
     * Get content type based on file extension
     */
    private getContentType;
    /**
     * Validate admin authentication
     */
    private isValidAdminAuth;
}
export declare const router: Hono<{
    Bindings: Env;
}, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=router.d.ts.map