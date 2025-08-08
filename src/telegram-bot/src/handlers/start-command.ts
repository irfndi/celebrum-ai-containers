/**
 * Production-ready /start command handler for Telegram bot
 * Handles new user registration with invitation codes and existing user welcome
 */

import type { TelegramUpdate, TelegramWebhookContext, TelegramBotResponse } from '../types/index';
import { UserQueries, InvitationQueries } from '../../../db/src/index';
import { createFeatureFlagService } from '../../../shared/src/services/feature-flag-service';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../db/src/schema/index';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { D1Database } from '@cloudflare/workers-types';

// Schema validation for invitation codes
const invitationCodeSchema = z.string().min(3).max(20).regex(/^[A-Z0-9]+$/);

/**
 * Extracts invitation code from /start command text
 * @param text - The message text from Telegram
 * @returns The invitation code or null if not found
 */
function extractInvitationCode(text: string): string | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length > 1) {
    const code = parts[1].toUpperCase();
    return invitationCodeSchema.safeParse(code).success ? code : null;
  }
  return null;
}

/**
 * Creates a new user in the database
 * @param env - Environment with database access
 * @param userData - User information from Telegram
 * @returns The created user
 */
async function createNewUser(
  env: { DB: D1Database },
  userData: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }
) {
  const db = drizzle(env.DB, { schema });
  const userQueries = new UserQueries(db);
  
  return await userQueries.create({
    id: randomUUID(),
    telegramId: userData.telegramId,
    username: userData.username,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Validates an invitation code
 * @param env - Environment with database access
 * @param code - The invitation code to validate
 * @returns The invitation if valid, null otherwise
 */
async function validateInvitationCode(env: { DB: D1Database }, code: string) {
  const db = drizzle(env.DB, { schema });
  const invitationQueries = new InvitationQueries(db);
  const invitation = await invitationQueries.findByCode(code);
  
  if (!invitation) {
    return null;
  }
  
  // Check if invitation is still valid
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return null;
  }
  
  if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
    return null;
  }
  
  if (!invitation.isActive) {
    return null;
  }
  
  return invitation;
}

/**
 * Updates invitation usage count
 * @param env - Environment with database access
 * @param code - The invitation code
 * @param telegramId - The user's Telegram ID
 */
async function updateInvitationUsage(env: { DB: D1Database }, code: string, _telegramId: string) {
  const db = drizzle(env.DB, { schema });
  const invitationQueries = new InvitationQueries(db);
  await invitationQueries.incrementUsage(code);
}

/**
 * Main handler for /start command
 * Handles both new user registration and existing user welcome
 * 
 * @param update - Telegram update object
 * @param context - Webhook context with environment
 * @returns Telegram bot response or null if no response needed
 */
export async function handleStartCommand(
  update: TelegramUpdate,
  context: TelegramWebhookContext
): Promise<TelegramBotResponse | null> {
  try {
    if (!update.message?.from || !update.message?.chat) {
      return null;
    }

    const { env } = context;
    const db = drizzle(env.DB, { schema });
    const telegramUser = update.message.from;
    const telegramId = String(telegramUser.id);
    
    // Check if user already exists
    const userQueries = new UserQueries(db);
    const existingUser = await userQueries.findByTelegramId(telegramId);
    
    // New user registration
    const invitationCode = extractInvitationCode(update.message.text || '');
    
    // Check if invitation is required
    const featureFlagService = createFeatureFlagService(env);
    const invitationRequired = await featureFlagService.isFeatureEnabled('registration.invitation_required');
    
    if (existingUser) {
      // Check if existing users can bypass invitation requirement
      const bypassForExisting = await featureFlagService.isFeatureEnabled('registration.bypass_for_existing');
      
      if (bypassForExisting || !invitationRequired) {
        // Welcome back existing user
        return {
          method: 'sendMessage',
          chat_id: update.message.chat.id,
          text: `Welcome back, ${existingUser.firstName || 'Trader'}! 🎉\n\nYour account is active and ready to use. Check your portfolio or start trading with /portfolio or /trade.`,
          parse_mode: 'HTML',
        };
      }
      
      // If invitation is required and user cannot bypass, check for invitation code
      if (invitationRequired && !invitationCode) {
        return {
          method: 'sendMessage',
          chat_id: update.message.chat.id,
          text: 'Welcome back! 🎉\n\nAccess to the platform requires a valid invitation code. Please use /start YOUR_CODE to continue.\n\nNeed help? Contact support or use /help for assistance.',
          parse_mode: 'HTML',
        };
      }
    }
    
    if (invitationRequired && !invitationCode && !existingUser) {
      return {
        method: 'sendMessage',
        chat_id: update.message.chat.id,
        text: 'Welcome to Celebrum AI! 🚀\n\nRegistration requires an invitation code. Please use /start YOUR_CODE to register.\n\nNeed help? Contact support or use /help for assistance.',
        parse_mode: 'HTML',
      };
    }

    // Validate invitation code if provided and required
    if (invitationCode) {
      const invitation = await validateInvitationCode(env, invitationCode);
      
      if (!invitation) {
        return {
          method: 'sendMessage',
          chat_id: update.message.chat.id,
          text: '❌ Invalid invitation code. Please check your code and try again.\n\nNeed help? Use /help for assistance.',
          parse_mode: 'HTML',
        };
      }
      
      // Update invitation usage
      await updateInvitationUsage(env, invitationCode, telegramId);
    }

    // Create new user
    const newUser = await createNewUser(env, {
      telegramId,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    });

    // Send welcome message
    const welcomeMessage = `
Welcome to Celebrum AI, ${newUser.firstName || 'Trader'}! 🎉

Your account has been successfully created. You now have access to:
• Real-time market analysis
• AI-powered trading signals
• Portfolio management
• Risk assessment tools

Get started with /portfolio to view your dashboard or /help for available commands.
    `.trim();

    return {
      method: 'sendMessage',
      chat_id: update.message.chat.id,
      text: welcomeMessage,
      parse_mode: 'HTML',
    };

  } catch (error) {
    console.error('Error in handleStartCommand:', error);
    
    // Return user-friendly error message
    return {
      method: 'sendMessage',
      chat_id: update.message?.chat?.id || 0,
      text: 'Sorry, there was an error processing your request. Please try again later.',
      parse_mode: 'HTML',
    };
  }
}

// Backward compatibility export
export { handleStartCommand as handleStart };