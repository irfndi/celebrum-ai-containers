import type { 
  TelegramBotResponse, 
  TelegramUpdate,
  TelegramApiResponse
} from '../types/index';

// Telegram API utilities
export class TelegramAPI {
  private baseUrl: string;

  constructor(botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  // Send message to Telegram
  async sendMessage(
    chatId: number, 
    text: string, 
    options: Partial<TelegramBotResponse> = {}
  ): Promise<boolean> {
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
    } catch (error) {
      console.error('Failed to send telegram message:', error);
      return false;
    }
  }

  // Set webhook
  async setWebhook(url: string): Promise<boolean> {
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

      const result = await response.json() as TelegramApiResponse;
      return result.ok;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      return false;
    }
  }

  // Delete webhook
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json() as TelegramApiResponse;
      return result.ok;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      return false;
    }
  }

  // Get webhook info
  async getWebhookInfo(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
      const result = await response.json() as TelegramApiResponse;
      return result.ok ? true : false;
    } catch (error) {
      console.error('Failed to get webhook info:', error);
      return false;
    }
  }

  // Send typing action
  async sendChatAction(chatId: number, action: string = 'typing'): Promise<boolean> {
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
    } catch (error) {
      console.error('Failed to send chat action:', error);
      return false;
    }
  }
}

// Utility functions
export function extractCommand(text: string): string | null {
  const commandMatch = text.match(/^\/([\w_]+)/);
  return commandMatch ? commandMatch[1] : null;
}

export function extractCommandArgs(text: string): string[] {
  const parts = text.split(' ');
  return parts.length > 1 ? parts.slice(1) : [];
}

export function isPrivateChat(update: TelegramUpdate): boolean {
  return update.message?.chat.type === 'private';
}

export function getUserId(update: TelegramUpdate): number | null {
  return update.message?.from?.id || update.callback_query?.from?.id || null;
}

export function getChatId(update: TelegramUpdate): number | null {
  return update.message?.chat.id || update.callback_query?.message?.chat.id || null;
}

export function formatUserMention(userId: number, firstName: string): string {
  return `<a href="tg://user?id=${userId}">${firstName}</a>`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function validateBotToken(token: string): boolean {
  // Telegram bot token format: {bot_id}:{bot_secret}
  const tokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
  return tokenRegex.test(token);
}

export function createInlineKeyboard(buttons: Array<Array<{text: string, callback_data?: string, url?: string}>>): any {
  return {
    inline_keyboard: buttons
  };
}

// Rate limiting utilities
const rateLimitMap = new Map<number, { count: number; resetTime: number }>();

export function isRateLimited(userId: number, maxRequests: number = 10, windowMs: number = 60000): boolean {
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

export function clearRateLimit(userId: number): void {
  rateLimitMap.delete(userId);
}