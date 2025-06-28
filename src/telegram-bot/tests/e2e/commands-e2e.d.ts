/**
 * Test file for Telegram bot functionality
 * This file can be used to test handlers and utilities locally
 */
import { TelegramUpdate, TelegramWebhookContext } from '../../src/types/index';
declare const mockContext: TelegramWebhookContext;
declare function createTestUpdate(command: string, userId?: number, chatId?: number): TelegramUpdate;
declare function testHandlers(): Promise<void>;
declare function testUtilities(): void;
declare function testCallbackQuery(): Promise<void>;
declare function runTests(): Promise<void>;
export { createTestUpdate, mockContext, testHandlers, testUtilities, testCallbackQuery, runTests };
//# sourceMappingURL=commands-e2e.d.ts.map