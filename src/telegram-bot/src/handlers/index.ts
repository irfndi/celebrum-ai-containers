import type { 
  TelegramUpdate, 
  TelegramBotResponse, 
  TelegramHandler,
  TelegramWebhookContext
} from '../types/index';
import { extractCommand, isRateLimited, getChatId, getUserId } from '../utils/index';
import { SessionService, UserService, InvitationService } from '@celebrum-ai/shared';
import { createDb } from '@celebrum-ai/db';
import { ValidationError, NotFoundError } from '@celebrum-ai/shared/errors';

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
    console.log('Processing update with message:', message);
    if (!message?.text) {
      console.log('No message text found');
      return null;
    }

    // Extract command from message
    console.log('Message text:', message.text);
    const command = extractCommand(message.text);
    console.log('Extracted command:', command);
    if (!command) {
      console.log('No command extracted');
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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    
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
      console.log('Start command triggered for user:', update.message?.from?.id);
      const sessionService = new SessionService(context.env.SESSIONS);
      const chatId = getChatId(update);
      const from = update.message?.from;

      if (!chatId || !from) return null;

      const db = createDb(context.env.DB);
      const userService = new UserService(db);
      const invitationService = new InvitationService(db);
      const telegramId = from.id.toString();
      console.log('Looking for user with telegramId:', telegramId);
      let user = await userService.findUserByTelegramId(telegramId);
      console.log('User found:', user);

      // Extract invitation code from command arguments (e.g., /start ABC123)
      const messageText = update.message?.text || '';
      const args = messageText.split(' ').slice(1);
      const invitationCode = args[0];

      let welcomeMessage;
      if (user) {
        // Existing user - just create a new session
        await sessionService.deleteSessionByTelegramId(telegramId); // Clean up old sessions
        const session = await sessionService.createSession(user);
        welcomeMessage = `👋 <b>Welcome back, ${from.first_name}!</b>\n\nYour trading journey continues. What would you like to do today?\n\n(Session ID: ${session.sessionId})`;
      } else {
        // New user - require invitation code
        if (!invitationCode) {
          return {
            method: 'sendMessage',
            chat_id: chatId,
            text: `🔑 <b>Invitation Required</b>\n\nHello ${from.first_name}! Celebrum Trading Platform is currently in private beta.\n\nPlease use the /start command followed by your invitation code:\n\n<code>/start YOUR_INVITATION_CODE</code>\n\nIf you don't have an invitation code, please contact our team or join our waiting list.`,
            parse_mode: 'HTML'
          };
        }

        try {
          // Validate the invitation code
          await invitationService.validateInvitationCode(invitationCode);
          
          // Create the user
          user = await userService.createUser({
            telegramId: telegramId,
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username,
            // Use type assertion to bypass the type check
            ...(from.language_code ? { languageCode: from.language_code } : {})
          });

          // Record the invitation code usage
          await invitationService.useInvitationCode(invitationCode, user.id.toString(), parseInt(telegramId, 10));
          
          // Create session
          const session = await sessionService.createSession(user);
          
          welcomeMessage = `🚀 <b>Welcome to Celebrum Trading Platform, ${from.first_name}!</b>\n\nYour account has been created. I'm your AI-powered trading assistant. Here's what I can help you with:\n\n📊 <b>Market Analysis</b>\n• Real-time arbitrage opportunities\n• Price tracking across exchanges\n• Market insights and trends\n\n🛠️ <b>Trading Tools</b>\n• Portfolio management\n• Risk assessment\n• Trade execution assistance\n\nType /help to see all available commands or /opportunities to get started!\n\n<i>Ready to maximize your trading potential? Let's go! 🎯</i>\n\n(Session ID: ${session.sessionId})`;
        } catch (error) {
          if (error instanceof NotFoundError || error instanceof ValidationError) {
            return {
              method: 'sendMessage',
              chat_id: chatId,
              text: `❌ <b>Invalid Invitation Code</b>\n\nThe invitation code you provided is invalid, expired, or has reached its maximum usage.\n\nPlease try again with a valid invitation code:\n\n<code>/start YOUR_INVITATION_CODE</code>\n\nIf you need assistance, please contact our support team.`,
              parse_mode: 'HTML'
            };
          }
          
          // For other errors, log and return a generic error message
          console.error('Error during user registration:', error);
          return {
            method: 'sendMessage',
            chat_id: chatId,
            text: `⚠️ <b>Registration Error</b>\n\nWe encountered an error while processing your registration. Please try again later or contact support.`,
            parse_mode: 'HTML'
          };
        }
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
    handler: async (update, context) => {
      const chatId = getChatId(update);
      const _userId = getUserId(update);
      if (!chatId) return null;

      let helpText = `🤖 <b>Celebrum Trading Bot Commands</b>\n\n`;
      
      // Standard commands available to all users
      helpText += `🚀 /start [code] - Welcome message and registration\n`;
      helpText += `📊 /opportunities [filter] - View arbitrage opportunities\n`;
      helpText += `👤 /profile - View and manage your profile\n`;
      helpText += `💰 /balance - Check account balance and P&L\n`;
      helpText += `⚙️ /settings - Configure trading preferences\n`;
      helpText += `🧪 /beta - Check your beta access status\n`;
      helpText += `❓ /help - Show this help message\n`;
      helpText += `📊 /status - Check bot status\n`;
      
      // Check if user is admin for admin commands
      const from = update.message?.from;
      if (from) {
        const adminIds = (context.env.ADMIN_TELEGRAM_IDS || '').split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id));
        if (adminIds.includes(from.id)) {
          helpText += `\n<b>👑 Admin Commands</b>\n`;
          helpText += `🔑 /createinvites <count> [purpose] [max_uses] [expires_days] - Create invitation codes\n`;
          helpText += `📊 /invitestats - View invitation statistics\n`;
        }
      }
      
      helpText += `\n💡 <i>New users need an invitation code: /start YOUR_CODE</i>`;

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

  // Admin: Create invitation codes
  registerHandler({
    command: 'createinvites',
    description: 'Create invitation codes (Admin only)',
    handler: async (update, context) => {
      const chatId = getChatId(update);
      const from = update.message?.from;
      if (!chatId || !from) return null;

      // TODO: Implement proper admin check
      // For now, we'll use a simple check - you can replace this with proper RBAC
      const adminIds = (context.env.ADMIN_TELEGRAM_IDS || '').split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id));
      if (!adminIds.includes(from.id)) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ <b>Access Denied</b>\n\nThis command is only available to administrators.',
          parse_mode: 'HTML'
        };
      }

      const messageText = update.message?.text || '';
      const args = messageText.split(' ').slice(1);
      
      // Parse arguments: /createinvites <count> [purpose] [max_uses] [expires_days]
      const count = parseInt(args[0], 10) || 1;
      const purpose = args[1] || 'general';
      const maxUses = args[2] ? parseInt(args[2], 10) : null;
      const expiresDays = args[3] ? parseInt(args[3], 10) : null;

      if (count > 50) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ <b>Invalid Request</b>\n\nMaximum 50 invitation codes can be created at once.',
          parse_mode: 'HTML'
        };
      }

      try {
        const db = createDb(context.env.DB);
        const invitationService = new InvitationService(db);
        
        const codes = [];
        for (let i = 0; i < count; i++) {
          const code = Math.random().toString(36).substring(2, 10).toUpperCase();
          codes.push({
            code,
            purpose,
            created_by: from.id.toString(),
            max_uses: maxUses || undefined,
            expires_at: expiresDays ? Date.now() + (expiresDays * 24 * 60 * 60 * 1000) : undefined
          });
        }

        const createdCodes = await invitationService.createInvitationCodes(codes);
        
        let responseText = `✅ <b>Invitation Codes Created</b>\n\n`;
        responseText += `📊 <b>Summary:</b>\n`;
        responseText += `• Count: ${createdCodes.length}\n`;
        responseText += `• Purpose: ${purpose}\n`;
        responseText += `• Max Uses: ${maxUses || 'Unlimited'}\n`;
        responseText += `• Expires: ${expiresDays ? `${expiresDays} days` : 'Never'}\n\n`;
        
        responseText += `🔑 <b>Generated Codes:</b>\n`;
        createdCodes.forEach((code) => {
          responseText += `<code>${code.code}</code>\n`;
        });
        
        responseText += `\n💡 <i>Users can register with: /start CODE</i>`;

        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: responseText,
          parse_mode: 'HTML'
        };
      } catch (error) {
        console.error('Error creating invitation codes:', error);
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ <b>Error</b>\n\nFailed to create invitation codes. Please try again.',
          parse_mode: 'HTML'
        };
      }
    }
  });

  // Admin: View invitation statistics
  registerHandler({
    command: 'invitestats',
    description: 'View invitation statistics (Admin only)',
    handler: async (update, context) => {
      const chatId = getChatId(update);
      const from = update.message?.from;
      if (!chatId || !from) return null;

      // TODO: Implement proper admin check
      const adminIds = (context.env.ADMIN_TELEGRAM_IDS || '').split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id));
      if (!adminIds.includes(from.id)) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ <b>Access Denied</b>\n\nThis command is only available to administrators.',
          parse_mode: 'HTML'
        };
      }

      try {
        const db = createDb(context.env.DB);
        const invitationService = new InvitationService(db);
        const stats = await invitationService.getInvitationMetrics();

        const responseText = `📊 <b>Invitation Statistics</b>\n\n` +
                            `🔑 <b>Invitation Codes:</b>\n` +
                            `• Total: ${stats.totalCodes}\n` +
                            `• Active: ${stats.activeCodes}\n` +
                            `• Used: ${stats.usedCodes}\n\n` +
                            `👥 <b>Users:</b>\n` +
                            `• Total Registered: ${stats.totalUsers}\n` +
                            `• Active Beta Users: ${stats.activeBetaUsers}\n\n` +
                            `📈 <b>Usage Rate:</b> ${stats.totalCodes > 0 ? Math.round((stats.usedCodes / stats.totalCodes) * 100) : 0}%`;

        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: responseText,
          parse_mode: 'HTML'
        };
      } catch (error) {
        console.error('Error fetching invitation stats:', error);
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ <b>Error</b>\n\nFailed to fetch invitation statistics.',
          parse_mode: 'HTML'
        };
      }
    }
  });

  // Beta status command for users
  registerHandler({
    command: 'beta',
    description: 'Check your beta access status',
    handler: async (update, context) => {
      const chatId = getChatId(update);
      const from = update.message?.from;
      if (!chatId || !from) return null;

      try {
        const db = createDb(context.env.DB);
        const userService = new UserService(db);
        const invitationService = new InvitationService(db);
        
        const user = await userService.findUserByTelegramId(from.id.toString());
        if (!user) {
          return {
            method: 'sendMessage',
            chat_id: chatId,
            text: '❌ <b>User Not Found</b>\n\nPlease use /start to register first.',
            parse_mode: 'HTML'
          };
        }

        const hasAccess = await invitationService.hasActiveBetaAccess(user.id.toString());
        const expirationDate = await invitationService.getBetaExpirationDate(user.id.toString());

        let responseText = `🧪 <b>Beta Access Status</b>\n\n`;
        
        if (hasAccess && expirationDate) {
          const daysLeft = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          responseText += `✅ <b>Status:</b> Active\n`;
          responseText += `📅 <b>Expires:</b> ${expirationDate.toLocaleDateString()}\n`;
          responseText += `⏰ <b>Days Remaining:</b> ${daysLeft}\n\n`;
          responseText += `🎯 <i>Enjoy full access to all beta features!</i>`;
        } else if (expirationDate) {
          responseText += `❌ <b>Status:</b> Expired\n`;
          responseText += `📅 <b>Expired On:</b> ${expirationDate.toLocaleDateString()}\n\n`;
          responseText += `💡 <i>Contact support to extend your access.</i>`;
        } else {
          responseText += `❌ <b>Status:</b> No Beta Access\n\n`;
          responseText += `🔑 <i>You need an invitation code to access beta features.</i>`;
        }

        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: responseText,
          parse_mode: 'HTML'
        };
      } catch (error) {
        console.error('Error checking beta status:', error);
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ <b>Error</b>\n\nFailed to check beta status.',
          parse_mode: 'HTML'
        };
      }
    }
  });
}