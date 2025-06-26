import type { 
  TelegramUpdate, 
  TelegramBotResponse, 
  TelegramHandler,
  TelegramWebhookContext
} from '../types/index';
import { extractCommand, isRateLimited, getChatId, getUserId } from '../utils/index';
import { SessionService, UserService } from '@celebrum-ai/shared';
import { createDb } from '@celebrum-ai/db';

// Command handlers registry
export const TELEGRAM_HANDLERS = new Map<string, TelegramHandler>();

// Register a command handler
export function registerHandler(handler: TelegramHandler): void {
  TELEGRAM_HANDLERS.set(handler.command, handler);
}

// Get handler for command
export function getHandler(command: string): TelegramHandler | undefined {
  return TELEGRAM_HANDLERS.get(command);
}

// Get all registered handlers
export function getAllHandlers(): TelegramHandler[] {
  return Array.from(TELEGRAM_HANDLERS.values());
}

// Process telegram update and route to appropriate handler
export async function processTelegramUpdate(
  update: TelegramUpdate,
  context: TelegramWebhookContext
): Promise<TelegramBotResponse | null> {
  try {
    // Handle callback queries
    if (update.callback_query) {
      return await processCallbackQuery(update, context);
    }

    // Handle messages
    const message = update.message;
    if (!message?.text) {
      return null;
    }

    // Extract command from message
    const command = extractCommand(message.text);
    if (!command) {
      return null;
    }

    // Rate limiting check
    const userId = getUserId(update);
    if (userId && isRateLimited(userId)) {
      const chatId = getChatId(update);
      if (chatId) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '⚠️ Too many requests. Please wait a moment before trying again.',
          parse_mode: 'HTML'
        };
      }
      return null;
    }

    // Get and execute handler
    const handler = getHandler(command);
    
    if (!handler) {
      const chatId = getChatId(update);
      if (chatId) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: `❌ Unknown command: /${command}\n\nType /help for available commands.`,
          parse_mode: 'HTML'
        };
      }
      return null;
    }

    // Execute handler
    return await handler.handler(update, context);

  } catch (error) {
    console.error('Error processing telegram update:', error);
    
    const chatId = getChatId(update);
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

// Process callback queries (inline keyboard button presses)
export async function processCallbackQuery(
  update: TelegramUpdate,
  context: TelegramWebhookContext
): Promise<TelegramBotResponse | null> {
  const callbackQuery = update.callback_query;
  if (!callbackQuery?.data) {
    return null;
  }

  try {
    // Parse callback data (format: "command:data")
    const [command, ...dataParts] = callbackQuery.data.split(':');
    const data = dataParts.join(':');

    // Find handler for callback command
    const handler = getHandler(command);
    if (!handler) {
      return {
        method: 'answerCallbackQuery',
        callback_query_id: callbackQuery.id,
        text: 'Unknown command',
        show_alert: true
      };
    }

    // Create a modified update for callback processing
    const modifiedUpdate: TelegramUpdate = {
      ...update,
      message: callbackQuery.message ? {
        ...callbackQuery.message,
        text: `/${command} ${data}`.trim()
      } : undefined
    };

    const response = await handler.handler(modifiedUpdate, context);
    
    // Always answer the callback query to remove loading state
    if (response) {
      // If we're sending a message, also answer the callback query
      context.waitUntil(
        fetch(`https://api.telegram.org/bot${context.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id
          })
        })
      );
    }

    return response;

  } catch (error) {
    console.error('Error processing callback query:', error);
    return {
      method: 'answerCallbackQuery',
      callback_query_id: callbackQuery.id,
      text: 'An error occurred',
      show_alert: true
    };
  }
}

// Initialize default handlers
export function initializeHandlers(): void {
  // Start command
  registerHandler({
    command: 'start',
    description: 'Start the bot and create/authenticate your account',
    handler: async (update, context) => {
      const sessionService = new SessionService(context.env.SESSIONS);
      const chatId = getChatId(update);
      const from = update.message?.from;

      if (!chatId || !from) return null;

      const userService = new UserService(createDb(context.env.DB));
      const telegramId = from.id.toString();
      let user = await userService.findUserByTelegramId(telegramId);

      let welcomeMessage;
      if (user) {
        await sessionService.deleteSessionByTelegramId(telegramId); // Clean up old sessions
        const session = await sessionService.createSession(user);
        welcomeMessage = `👋 <b>Welcome back, ${from.first_name}!</b>\n\nYour trading journey continues. What would you like to do today?\n\n(Session ID: ${session.sessionId})`;
      } else {
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
    }
  });

  // Help command
  registerHandler({
    command: 'help',
    description: 'Show available commands',
    handler: async (update, _context) => {
      const chatId = getChatId(update);
      const _userId = getUserId(update);
      if (!chatId) return null;

      let helpText = `🤖 <b>ArbEdge Bot Commands</b>\n\n`;
      
      // Standard commands available to all users
      helpText += `🚀 /start - Welcome message and quick start\n`;
      helpText += `📊 /opportunities [filter] - View arbitrage opportunities\n`;
      helpText += `👤 /profile - View and manage your profile\n`;
      helpText += `💰 /balance - Check account balance and P&L\n`;
      helpText += `⚙️ /settings - Configure trading preferences\n`;
      helpText += `❓ /help - Show this help message\n`;
      helpText += `📊 /status - Check bot status\n`;
      
      // TODO: Add admin check when user permissions are implemented
      // if (isAdmin(userId)) {
      //   helpText += `\n<b>👑 Admin Commands</b>\n`;
      //   helpText += `/admin [action] - Access admin functions\n`;
      // }
      
      helpText += `\n💡 <i>Pro tip: Use /opportunities high to see only high-profit opportunities!</i>`;

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: helpText,
        parse_mode: 'HTML'
      };
    }
  });

  // Opportunities command
  registerHandler({
    command: 'opportunities',
    description: 'View arbitrage opportunities',
    handler: async (update, _context) => {
      const chatId = getChatId(update);
      const userId = getUserId(update);
      if (!chatId) return null;

      // Extract filter argument
      const message = update.message?.text || '';
      const args = message.split(' ').slice(1);
      const filter = args[0] || 'all';

      console.log(`📊 Processing /opportunities command for user ${userId} with filter: ${filter}`);

      // TODO: Implement actual opportunities fetching from database/API
      let responseText = `📊 <b>Arbitrage Opportunities</b>\n\n`;
      
      if (filter === 'high') {
        responseText += `🔥 <b>High-Profit Opportunities (>5%)</b>\n\n`;
        responseText += `💎 BTC/USDT: 7.2% profit\n`;
        responseText += `📈 Binance → Coinbase\n`;
        responseText += `💰 Potential: $1,440 (on $20k)\n\n`;
      } else {
        responseText += `📈 <b>All Available Opportunities</b>\n\n`;
        responseText += `💎 BTC/USDT: 7.2% profit\n`;
        responseText += `🥈 ETH/USDT: 3.8% profit\n`;
        responseText += `🥉 ADA/USDT: 2.1% profit\n\n`;
      }
      
      responseText += `🔄 <i>Updated: ${new Date().toLocaleTimeString()}</i>\n\n`;
      responseText += `💡 Use /opportunities high for high-profit only`;

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML'
      };
    }
  });

  // Balance command
  registerHandler({
    command: 'balance',
    description: 'Check account balance and P&L',
    handler: async (update, _context) => {
      const chatId = getChatId(update);
      const userId = getUserId(update);
      if (!chatId) return null;

      console.log(`💰 Processing /balance command for user ${userId}`);

      // TODO: Implement actual balance fetching from database
      const responseText = `💰 <b>Account Balance</b>\n\n` +
                          `💵 <b>Total Balance:</b> $25,430.50\n` +
                          `📈 <b>Today's P&L:</b> +$1,240.30 (+5.1%)\n` +
                          `📊 <b>This Week:</b> +$3,890.75 (+18.1%)\n` +
                          `📅 <b>This Month:</b> +$8,120.40 (+46.9%)\n\n` +
                          `🔄 <b>Active Positions:</b>\n` +
                          `• BTC/USDT: $5,200 (3 exchanges)\n` +
                          `• ETH/USDT: $3,100 (2 exchanges)\n\n` +
                          `🕐 <i>Last updated: ${new Date().toLocaleTimeString()}</i>`;

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML'
      };
    }
  });

  // Profile command
  registerHandler({
    command: 'profile',
    description: 'View and manage your profile',
    handler: async (update, _context) => {
      const chatId = getChatId(update);
      const userId = getUserId(update);
      const username = update.message?.from?.username;
      if (!chatId) return null;

      console.log(`👤 Processing /profile command for user ${userId}`);

      // TODO: Implement actual profile fetching from database
      const responseText = `👤 <b>Your Profile</b>\n\n` +
                          `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
                          `👤 <b>Username:</b> ${username ? `@${username}` : 'Not set'}\n` +
                          `📅 <b>Member since:</b> January 2024\n` +
                          `🎯 <b>Trading Level:</b> Advanced\n` +
                          `⚡ <b>API Status:</b> Connected\n\n` +
                          `📊 <b>Trading Stats:</b>\n` +
                          `• Total trades: 1,247\n` +
                          `• Success rate: 89.3%\n` +
                          `• Avg profit: 4.2%\n\n` +
                          `⚙️ Use /settings to modify preferences`;

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML'
      };
    }
  });

  // Settings command
  registerHandler({
    command: 'settings',
    description: 'Configure trading preferences',
    handler: async (update, _context) => {
      const chatId = getChatId(update);
      const userId = getUserId(update);
      if (!chatId) return null;

      console.log(`⚙️ Processing /settings command for user ${userId}`);

      // TODO: Implement actual settings management with inline keyboards
      const responseText = `⚙️ <b>Trading Settings</b>\n\n` +
                          `🎯 <b>Risk Level:</b> Medium\n` +
                          `💰 <b>Min Profit:</b> 2.5%\n` +
                          `📊 <b>Max Position:</b> $10,000\n` +
                          `🔔 <b>Notifications:</b> Enabled\n` +
                          `⏰ <b>Trading Hours:</b> 24/7\n` +
                          `🏦 <b>Exchanges:</b> Binance, Coinbase, Kraken\n\n` +
                          `💡 <i>Settings can be modified through the web interface</i>\n` +
                          `🌐 Visit: https://arb-edge.com/settings`;

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML'
      };
    }
  });

  // Status command
  registerHandler({
    command: 'status',
    description: 'Check bot status',
    handler: async (update, _context) => {
      const chatId = getChatId(update);
      if (!chatId) return null;

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `✅ <b>Bot Status:</b> Online\n` +
              `🕐 <b>Uptime:</b> ${new Date().toISOString()}\n` +
              `🔧 <b>Version:</b> 1.0.0\n` +
              `📡 <b>API Status:</b> Connected\n` +
              `💾 <b>Database:</b> Operational`,
        parse_mode: 'HTML'
      };
    }
  });
}