import type { User, NewUser, UserUsernameHistory, NewUserUsernameHistory } from '../../../db/src/schema';
import { UserQueries, UserUsernameHistoryQueries, type Database } from '../../../db/src/index';

export class UserService {
  private userQueries: UserQueries;
  private usernameHistoryQueries: UserUsernameHistoryQueries;

  constructor(db: Database) {
    this.userQueries = new UserQueries(db);
    this.usernameHistoryQueries = new UserUsernameHistoryQueries(db);
  }

  async findUserByTelegramId(telegramId: string): Promise<User | null> {
    const result = await this.userQueries.findByTelegramId(telegramId);
    return result;
  }

  async createUser(userData: Partial<NewUser>): Promise<User> {
    const newUser: NewUser = {
      telegramId: userData.telegramId!,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      status: 'active',
      role: 'free',
      ...userData,
    };
    return this.userQueries.create(newUser);
  }

  async updateUser(id: string, updates: Partial<NewUser>): Promise<User | undefined> {
    return this.userQueries.update(id, updates);
  }

  /**
   * Updates user data from Telegram interaction (automatic fields only)
   * Tracks username changes in history table
   */
  async updateFromTelegramData(
    telegramId: string, 
    telegramData: {
      firstName?: string;
      lastName?: string;
      username?: string;
      languageCode?: string;
    }
  ): Promise<User | undefined> {
    const existingUser = await this.findUserByTelegramId(telegramId);
    if (!existingUser) {
      return undefined;
    }

    // Track username change if it's different
    if (telegramData.username !== existingUser.username) {
      await this.trackUsernameChange(
        existingUser.id,
        telegramId,
        telegramData.username || null,
        'telegram_update'
      );
    }

    // Update automatic fields only - but preserve existing values if they exist
    const updates: Partial<NewUser> = {
      // Override firstName and lastName with Telegram data
      firstName: telegramData.firstName,
      lastName: telegramData.lastName,
      // Always update username as it can change in Telegram
      username: telegramData.username,
      // Override languageCode with Telegram data
      languageCode: telegramData.languageCode,
      lastActiveAt: new Date(),
    };

    const result = await this.userQueries.update(existingUser.id, updates);
    return result;
  }

  /**
   * Updates user data manually (user-controlled fields only)
   * Does NOT update Telegram-controlled fields
   */
  async updateManualFields(
    id: string, 
    updates: {
      email?: string;
      settings?: unknown;
      tradingPreferences?: unknown;
    }
  ): Promise<User | undefined> {
    // Only allow manual updates to specific fields
    const allowedUpdates: Partial<NewUser> = {};
    if (updates.email !== undefined) allowedUpdates.email = updates.email;
    if (updates.settings !== undefined) allowedUpdates.settings = updates.settings;
    if (updates.tradingPreferences !== undefined) allowedUpdates.tradingPreferences = updates.tradingPreferences;

    return this.userQueries.update(id, allowedUpdates);
  }

  /**
   * Tracks username changes in the history table
   */
  private async trackUsernameChange(
    userId: string,
    telegramId: string,
    newUsername: string | null,
    changeSource: 'telegram_update' | 'manual_correction' | 'system_migration' = 'telegram_update'
  ): Promise<UserUsernameHistory> {
    const historyEntry: NewUserUsernameHistory = {
      userId,
      telegramId,
      username: newUsername,
      changeSource,
    };

    return this.usernameHistoryQueries.create(historyEntry);
  }

  /**
   * Gets username history for a user
   */
  async getUsernameHistory(telegramId: string): Promise<UserUsernameHistory[]> {
    return this.usernameHistoryQueries.findByTelegramId(telegramId);
  }

  /**
   * Gets the latest username from history (for security/auditing)
   */
  async getLatestUsernameFromHistory(telegramId: string): Promise<string | null> {
    return this.usernameHistoryQueries.getLatestUsername(telegramId);
  }

  /**
   * Creates a user and tracks initial username
   */
  async createUserWithUsernameTracking(userData: Partial<NewUser>): Promise<User> {
    const newUser = await this.createUser(userData);
    
    // Track initial username
    if (userData.username !== undefined) {
      await this.trackUsernameChange(
        newUser.id,
        newUser.telegramId,
        userData.username,
        'system_migration'
      );
    }

    return newUser;
  }
}