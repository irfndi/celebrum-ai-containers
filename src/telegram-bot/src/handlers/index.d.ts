import type { TelegramUpdate, TelegramBotResponse, TelegramHandler, TelegramWebhookContext } from '../types/index';
export declare const TELEGRAM_HANDLERS: Map<string, TelegramHandler>;
export declare function registerHandler(handler: TelegramHandler): void;
export declare function getHandler(command: string): TelegramHandler | undefined;
export declare function getAllHandlers(): TelegramHandler[];
export declare function processTelegramUpdate(update: TelegramUpdate, context: TelegramWebhookContext): Promise<TelegramBotResponse | null>;
export declare function processCallbackQuery(update: TelegramUpdate, context: TelegramWebhookContext): Promise<TelegramBotResponse | null>;
export declare function initializeHandlers(): void;
//# sourceMappingURL=index.d.ts.map