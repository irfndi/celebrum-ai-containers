"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAPI = void 0;
exports.extractCommand = extractCommand;
exports.extractCommandArgs = extractCommandArgs;
exports.isPrivateChat = isPrivateChat;
exports.getUserId = getUserId;
exports.getChatId = getChatId;
exports.formatUserMention = formatUserMention;
exports.escapeHtml = escapeHtml;
exports.validateBotToken = validateBotToken;
exports.createInlineKeyboard = createInlineKeyboard;
exports.isRateLimited = isRateLimited;
exports.clearRateLimit = clearRateLimit;
// Telegram API utilities
class TelegramAPI {
    baseUrl;
    constructor(botToken) {
        this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    }
    // Send message to Telegram
    async sendMessage(chatId, text, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: 'HTML',
                    ...options
                })
            });
            return response.ok;
        }
        catch (error) {
            console.error('Failed to send telegram message:', error);
            return false;
        }
    }
    // Set webhook
    async setWebhook(url) {
        try {
            const response = await fetch(`${this.baseUrl}/setWebhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    allowed_updates: ['message', 'callback_query']
                })
            });
            const result = await response.json();
            return result.ok;
        }
        catch (error) {
            console.error('Failed to set webhook:', error);
            return false;
        }
    }
    // Delete webhook
    async deleteWebhook() {
        try {
            const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = await response.json();
            return result.ok;
        }
        catch (error) {
            console.error('Failed to set webhook:', error);
            return false;
        }
    }
    // Get webhook info
    async getWebhookInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
            const result = await response.json();
            return result.ok ? true : false;
        }
        catch (error) {
            console.error('Failed to get webhook info:', error);
            return false;
        }
    }
    // Send typing action
    async sendChatAction(chatId, action = 'typing') {
        try {
            const response = await fetch(`${this.baseUrl}/sendChatAction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    action
                })
            });
            return response.ok;
        }
        catch (error) {
            console.error('Failed to send chat action:', error);
            return false;
        }
    }
}
exports.TelegramAPI = TelegramAPI;
// Utility functions
function extractCommand(text) {
    const commandMatch = text.match(/^\/([\w_]+)/);
    return commandMatch ? commandMatch[1] : null;
}
function extractCommandArgs(text) {
    const parts = text.split(' ');
    return parts.length > 1 ? parts.slice(1) : [];
}
function isPrivateChat(update) {
    return update.message?.chat.type === 'private';
}
function getUserId(update) {
    return update.message?.from?.id || update.callback_query?.from?.id || null;
}
function getChatId(update) {
    return update.message?.chat.id || update.callback_query?.message?.chat.id || null;
}
function formatUserMention(userId, firstName) {
    return `<a href="tg://user?id=${userId}">${firstName}</a>`;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function validateBotToken(token) {
    // Telegram bot token format: {bot_id}:{bot_secret}
    const tokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
    return tokenRegex.test(token);
}
function createInlineKeyboard(buttons) {
    return {
        inline_keyboard: buttons
    };
}
// Rate limiting utilities
const rateLimitMap = new Map();
function isRateLimited(userId, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);
    if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
        return false;
    }
    if (userLimit.count >= maxRequests) {
        return true;
    }
    userLimit.count++;
    return false;
}
function clearRateLimit(userId) {
    rateLimitMap.delete(userId);
}
//# sourceMappingURL=index.js.map