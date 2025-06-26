import type { TelegramUpdate, TelegramWebhookContext } from './types';
import { processTelegramUpdate, initializeHandlers } from './handlers';

// Initialize all the handlers
initializeHandlers();

export async function handleTelegramUpdate(update: TelegramUpdate, context: TelegramWebhookContext): Promise<Response> {
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