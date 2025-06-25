import type { TelegramUpdate, TelegramBotResponse, TelegramHandler, TelegramWebhookContext } from './types';
export declare const TELEGRAM_HANDLERS: Map<string, TelegramHandler>;
export declare function registerHandler(handler: TelegramHandler): void;
export declare function getHandler(command: string): TelegramHandler | undefined;
export declare function processTelegramUpdate(update: TelegramUpdate, context: TelegramWebhookContext): Promise<TelegramBotResponse | null>;
export declare const defaultHandlers: TelegramHandler[];
export declare function initializeDefaultHandlers(): void;
//# sourceMappingURL=handlers.d.ts.map