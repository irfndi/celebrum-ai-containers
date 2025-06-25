// Command handlers registry
export const TELEGRAM_HANDLERS = new Map();
// Register a command handler
export function registerHandler(handler) {
    TELEGRAM_HANDLERS.set(handler.command, handler);
}
// Get handler for command
export function getHandler(command) {
    return TELEGRAM_HANDLERS.get(command);
}
// Process telegram update and route to appropriate handler
export async function processTelegramUpdate(update, context) {
    try {
        // Extract command from message
        const message = update.message;
        if (!message?.text) {
            return null;
        }
        // Parse command (e.g., "/start", "/help")
        const commandMatch = message.text.match(/^\/(\w+)/);
        if (!commandMatch || !commandMatch[1]) {
            return null;
        }
        const command = commandMatch[1];
        const handler = getHandler(command);
        if (!handler) {
            return {
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: `Unknown command: /${command}. Type /help for available commands.`,
                parse_mode: 'HTML'
            };
        }
        // Execute handler
        return await handler.handler(update, context.env);
    }
    catch (error) {
        console.error('Error processing telegram update:', error);
        // Return error response if we have a chat ID
        const chatId = update.message?.chat.id;
        if (chatId) {
            return {
                method: 'sendMessage',
                chat_id: chatId,
                text: '❌ An error occurred while processing your request. Please try again later.',
                parse_mode: 'HTML'
            };
        }
        return null;
    }
}
// Default handlers
import { SessionService, UserService } from '@celebrum-ai/shared';
const start = async (update, env) => {
    const sessionService = new SessionService(env.SESSIONS);
    const chatId = update.message?.chat.id;
    const from = update.message?.from;
    if (!chatId || !from)
        return null;
    const userService = new UserService(env.DB);
    const telegramId = from.id.toString();
    let user = await userService.findUserByTelegramId(telegramId);
    let welcomeMessage;
    if (user) {
        await sessionService.deleteSessionByTelegramId(telegramId); // Clean up old sessions
        const session = await sessionService.createSession(user);
        welcomeMessage = `👋 <b>Welcome back, ${from.first_name}!</b>\n\nYour trading journey continues. What would you like to do today?\n\n(Session ID: ${session.sessionId})`;
    }
    else {
        user = await userService.createUser({
            telegramId: telegramId,
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username,
            // Use type assertion to bypass the type check
            ...(from.language_code ? { languageCode: from.language_code } : {})
        });
        const session = await sessionService.createSession(user);
        welcomeMessage = `🚀 <b>Welcome to Celebrum Trading Platform, ${from.first_name}!</b>\n\nYour account has been created. I'm your AI-powered trading assistant. Here's what I can help you with:\n\n📊 <b>Market Analysis</b>\n• Real-time arbitrage opportunities\n• Price tracking across exchanges\n• Market insights and trends\n\n🛠️ <b>Trading Tools</b>\n• Portfolio management\n• Risk assessment\n• Trade execution assistance\n\nType /help to see all available commands or /opportunities to get started!\n\n<i>Ready to maximize your trading potential? Let's go! 🎯</i>\n\n(Session ID: ${session.sessionId})`;
    }
    return {
        method: 'sendMessage',
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: 'HTML'
    };
};
export const defaultHandlers = [
    {
        command: 'start',
        description: 'Start the bot and create/authenticate your account',
        handler: start
    },
    {
        command: 'help',
        description: 'Show available commands',
        handler: async (update) => {
            const chatId = update.message?.chat.id;
            if (!chatId)
                return null;
            const commandList = Array.from(TELEGRAM_HANDLERS.values())
                .map(handler => `/${handler.command} - ${handler.description}`)
                .join('\n');
            return {
                method: 'sendMessage',
                chat_id: chatId,
                text: `📋 <b>Available Commands:</b>\n\n${commandList}`,
                parse_mode: 'HTML'
            };
        }
    }
];
// Initialize default handlers
export function initializeDefaultHandlers() {
    defaultHandlers.forEach(handler => {
        registerHandler(handler);
    });
}
//# sourceMappingURL=handlers.js.map