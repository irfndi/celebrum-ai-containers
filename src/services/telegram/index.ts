import { initializeDefaultHandlers, processTelegramUpdate } from './handlers';
import type { TelegramUpdate, TelegramWebhookContext } from './types';

// Initialize all the handlers
initializeDefaultHandlers();

export async function handleTelegramUpdate(update: TelegramUpdate, context: TelegramWebhookContext) {
    const response = await processTelegramUpdate(update, context);
    if (response) {
        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

export * from './types';