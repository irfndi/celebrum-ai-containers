import type { TelegramBotResponse, TelegramUpdate } from '../types/index';
export declare class TelegramAPI {
    private baseUrl;
    constructor(botToken: string);
    sendMessage(chatId: number, text: string, options?: Partial<TelegramBotResponse>): Promise<boolean>;
    setWebhook(url: string): Promise<boolean>;
    deleteWebhook(): Promise<boolean>;
    getWebhookInfo(): Promise<boolean>;
    sendChatAction(chatId: number, action?: string): Promise<boolean>;
}
export declare function extractCommand(text: string): string | null;
export declare function extractCommandArgs(text: string): string[];
export declare function isPrivateChat(update: TelegramUpdate): boolean;
export declare function getUserId(update: TelegramUpdate): number | null;
export declare function getChatId(update: TelegramUpdate): number | null;
export declare function formatUserMention(userId: number, firstName: string): string;
export declare function escapeHtml(text: string): string;
export declare function validateBotToken(token: string): boolean;
export declare function createInlineKeyboard(buttons: Array<Array<{
    text: string;
    callback_data?: string;
    url?: string;
}>>): any;
export declare function isRateLimited(userId: number, maxRequests?: number, windowMs?: number): boolean;
export declare function clearRateLimit(userId: number): void;
//# sourceMappingURL=index.d.ts.map