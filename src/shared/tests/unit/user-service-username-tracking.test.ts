import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../src/services/UserService';

// Mock types
type User = {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  createdAt: Date;
};

type UserUsernameHistory = {
  id: string;
  userId: string;
  username: string | null;
  changedAt: Date;
};

type Database = any;

// Mock the database modules
vi.mock('@celebrum-ai/db', () => {
  return {
    Database: vi.fn(),
    UserQueries: vi.fn(),
    UserUsernameHistoryQueries: vi.fn(),
  };
});

vi.mock('@celebrum-ai/db/schema', () => {
  return {
    users: {},
    userUsernameHistory: {},
  };
});

// Mock the database and queries
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as Database;

// Mock user data
const mockUser: User = {
  id: '1',
  telegramId: '123456789',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  languageCode: 'en',
  createdAt: new Date('2024-01-01'),
};

const mockUsernameHistory: UserUsernameHistory = {
  id: '1',
  userId: '1',
  username: 'johndoe',
  changedAt: new Date('2024-01-01'),
};

describe('UserService Username Tracking', () => {
  let userService: UserService;
  let mockUserQueries: any;
  let mockUsernameHistoryQueries: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock UserQueries
    mockUserQueries = {
      findByTelegramId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    
    // Mock UserUsernameHistoryQueries
    mockUsernameHistoryQueries = {
      findByTelegramId: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      getLatestUsername: vi.fn(),
    };
    
    userService = new UserService(mockDb);
    // Replace the private queries with our mocks
    (userService as any).userQueries = mockUserQueries;
    (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;
  });

  describe('updateFromTelegramData', () => {
    it('should update user data and track username change', async () => {
      // Arrange
      const telegramId = '123456789';
      const telegramData = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith', // Changed username
        languageCode: 'es',
      };
      
      mockUserQueries.findByTelegramId.mockResolvedValue(mockUser);
      mockUserQueries.update.mockResolvedValue({ ...mockUser, ...telegramData });
      mockUsernameHistoryQueries.create.mockResolvedValue(mockUsernameHistory);

      // Act
      const result = await userService.updateFromTelegramData(telegramId, telegramData);

      // Assert
      expect(mockUserQueries.findByTelegramId).toHaveBeenCalledWith(telegramId);
      expect(mockUsernameHistoryQueries.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        telegramId,
        username: 'janesmith',
        changeSource: 'telegram_update',
      });
      expect(mockUserQueries.update).toHaveBeenCalledWith(mockUser.id, {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        languageCode: 'es',
        lastActiveAt: expect.any(Date),
      });
      expect(result).toBeDefined();
    });

    it('should not track username change if username is the same', async () => {
      // Arrange
      const telegramId = '123456789';
      const telegramData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe', // Same username
        languageCode: 'en',
      };
      
      mockUserQueries.findByTelegramId.mockResolvedValue(mockUser);
      mockUserQueries.update.mockResolvedValue(mockUser);

      // Act
      await userService.updateFromTelegramData(telegramId, telegramData);

      // Assert
      expect(mockUsernameHistoryQueries.create).not.toHaveBeenCalled();
    });

    it('should track username change when username becomes null', async () => {
      // Arrange
      const telegramId = '123456789';
      const telegramData = {
        firstName: 'John',
        lastName: 'Doe',
        username: undefined, // Username removed
        languageCode: 'en',
      };
      
      mockUserQueries.findByTelegramId.mockResolvedValue(mockUser);
      mockUserQueries.update.mockResolvedValue({ ...mockUser, username: null });
      mockUsernameHistoryQueries.create.mockResolvedValue(mockUsernameHistory);

      // Act
      await userService.updateFromTelegramData(telegramId, telegramData);

      // Assert
      expect(mockUsernameHistoryQueries.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        telegramId,
        username: null,
        changeSource: 'telegram_update',
      });
    });

    it('should return undefined if user not found', async () => {
      // Arrange
      const telegramId = '999999999';
      const telegramData = { firstName: 'Test' };
      
      mockUserQueries.findByTelegramId.mockResolvedValue(undefined);

      // Act
      const result = await userService.updateFromTelegramData(telegramId, telegramData);

      // Assert
      expect(result).toBeUndefined();
      expect(mockUsernameHistoryQueries.create).not.toHaveBeenCalled();
      expect(mockUserQueries.update).not.toHaveBeenCalled();
    });
  });

  describe('updateManualFields', () => {
    it('should only update allowed manual fields', async () => {
      // Arrange
      const userId = 1;
      const updates = {
        email: 'john@example.com',
        settings: { theme: 'dark' },
        tradingPreferences: { riskTolerance: 'medium' },
        // These should be ignored
        firstName: 'Hacker',
        username: 'hacker123',
      };
      
      mockUserQueries.update.mockResolvedValue({ ...mockUser, ...updates });

      // Act
      await userService.updateManualFields(userId, updates);

      // Assert
      expect(mockUserQueries.update).toHaveBeenCalledWith(userId, {
        email: 'john@example.com',
        settings: { theme: 'dark' },
        tradingPreferences: { riskTolerance: 'medium' },
        // firstName and username should not be included
      });
    });

    it('should handle partial updates', async () => {
      // Arrange
      const userId = 1;
      const updates = {
        email: 'john@example.com',
      };
      
      mockUserQueries.update.mockResolvedValue({ ...mockUser, ...updates });

      // Act
      await userService.updateManualFields(userId, updates);

      // Assert
      expect(mockUserQueries.update).toHaveBeenCalledWith(userId, {
        email: 'john@example.com',
      });
    });
  });

  describe('createUserWithUsernameTracking', () => {
    it('should create user and track initial username', async () => {
      // Arrange
      const userData = {
        telegramId: '987654321',
        firstName: 'Alice',
        lastName: 'Johnson',
        username: 'alicejohnson',
        languageCode: 'fr',
      };
      
      const createdUser = { ...mockUser, ...userData, id: 2 };
      mockUserQueries.create.mockResolvedValue(createdUser);
      mockUsernameHistoryQueries.create.mockResolvedValue(mockUsernameHistory);

      // Act
      const result = await userService.createUserWithUsernameTracking(userData);

      // Assert
      expect(mockUserQueries.create).toHaveBeenCalled();
      expect(mockUsernameHistoryQueries.create).toHaveBeenCalledWith({
        userId: createdUser.id,
        telegramId: userData.telegramId,
        username: userData.username,
        changeSource: 'system_migration',
      });
      expect(result).toEqual(createdUser);
    });

    it('should not track username if not provided', async () => {
      // Arrange
      const userData = {
        telegramId: '987654321',
        firstName: 'Bob',
        lastName: 'Wilson',
        // No username provided
      };
      
      const createdUser = { ...mockUser, ...userData, id: 3, username: null };
      mockUserQueries.create.mockResolvedValue(createdUser);

      // Act
      await userService.createUserWithUsernameTracking(userData);

      // Assert
      expect(mockUsernameHistoryQueries.create).not.toHaveBeenCalled();
    });
  });

  describe('getUsernameHistory', () => {
    it('should return username history for a user', async () => {
      // Arrange
      const telegramId = '123456789';
      const expectedHistory = [mockUsernameHistory];
      
      mockUsernameHistoryQueries.findByTelegramId.mockResolvedValue(expectedHistory);

      // Act
      const result = await userService.getUsernameHistory(telegramId);

      // Assert
      expect(mockUsernameHistoryQueries.findByTelegramId).toHaveBeenCalledWith(telegramId);
      expect(result).toEqual(expectedHistory);
    });
  });

  describe('getLatestUsernameFromHistory', () => {
    it('should return the latest username from history', async () => {
      // Arrange
      const telegramId = '123456789';
      const expectedUsername = 'latestusername';
      
      mockUsernameHistoryQueries.getLatestUsername.mockResolvedValue(expectedUsername);

      // Act
      const result = await userService.getLatestUsernameFromHistory(telegramId);

      // Assert
      expect(mockUsernameHistoryQueries.getLatestUsername).toHaveBeenCalledWith(telegramId);
      expect(result).toEqual(expectedUsername);
    });
  });
});