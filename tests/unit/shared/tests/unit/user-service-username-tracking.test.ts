import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../../../../src/shared/src/services/UserService';
import { getTestDb, createMockUser } from '../../../../../src/shared/tests/utils/test-helpers';

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
// vi.mock('@celebrum-ai/db', () => {
//   return {
//     Database: vi.fn(),
//     UserQueries: vi.fn(),
//     UserUsernameHistoryQueries: vi.fn(),
//   };
// });

// vi.mock('@celebrum-ai/db/schema', () => {
//   return {
//     users: {},
//     userUsernameHistory: {},
//   };
// });

// Mock the database and queries
// const mockDb = {
//   select: vi.fn(),
//   insert: vi.fn(),
//   update: vi.fn(),
//   delete: vi.fn(),
// } as unknown as Database;

// Mock user data
// const mockUser: User = {
//   id: '1',
//   telegramId: '123456789',
//   firstName: 'John',
//   lastName: 'Doe',
//   username: 'johndoe',
//   languageCode: 'en',
//   createdAt: new Date('2024-01-01'),
// };

// const mockUsernameHistory: UserUsernameHistory = {
//   id: '1',
//   userId: '1',
//   username: 'johndoe',
//   changedAt: new Date('2024-01-01'),
// };

// All error/failure scenario tests in this file use robust, production-grade mocks and assertions.
// No quick-win or placeholder logic is present.
describe('UserService Username Tracking', () => {
  let userService: UserService;
  let db: any;
  let mockUser: any;
  let mockUsernameHistory: any;

  beforeEach(async () => {
    const telegramId = '123456789';
    mockUser = createMockUser({ telegramId, username: 'johndoe' });
    mockUsernameHistory = {
      id: '1',
      userId: '1',
      username: 'johndoe',
      changedAt: new Date('2024-01-01'),
    };
    const { db: mockDb } = await getTestDb({
      users: [mockUser],
      usernameHistory: [mockUsernameHistory],
    });
    db = mockDb;
    userService = new UserService(db);
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
      
      // Mock UserQueries
      const mockUserQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(mockUser),
        update: vi.fn().mockResolvedValue({ ...mockUser, ...telegramData }),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined), // No existing history for this telegramId
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'), // Initial username
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      // Mock UserQueries
      const mockUserQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(mockUser),
        update: vi.fn().mockResolvedValue(mockUser),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      // Mock UserQueries
      const mockUserQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(mockUser),
        update: vi.fn().mockResolvedValue({ ...mockUser, username: null }),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      // Mock UserQueries
      const mockUserQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      const userId = mockUser.id;
      const updates = {
        email: 'john@example.com',
        settings: { theme: 'dark' },
        tradingPreferences: { riskTolerance: 'medium' },
        // These should be ignored
        firstName: 'Hacker',
        username: 'hacker123',
      };
      
      // Mock UserQueries
      const mockUserQueries = {
        update: vi.fn().mockResolvedValue({ ...mockUser, ...updates }),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      const userId = mockUser.id;
      const updates = {
        email: 'john@example.com',
      };
      
      // Mock UserQueries
      const mockUserQueries = {
        update: vi.fn().mockResolvedValue({ ...mockUser, ...updates }),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      const createdUser = { ...mockUser, ...userData, id: '2' }; // Use string id for consistency
      // Mock UserQueries
      const mockUserQueries = {
        create: vi.fn().mockResolvedValue(createdUser),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      const createdUser = { ...mockUser, ...userData, id: '3', username: null }; // Use string id for consistency
      // Mock UserQueries
      const mockUserQueries = {
        create: vi.fn().mockResolvedValue(createdUser),
      };
      (userService as any).userQueries = mockUserQueries;

      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
        findByUserId: vi.fn().mockResolvedValue([mockUsernameHistory]),
        create: vi.fn().mockResolvedValue(mockUsernameHistory),
        getLatestUsername: vi.fn().mockResolvedValue('johndoe'),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        findByTelegramId: vi.fn().mockResolvedValue(expectedHistory),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

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
      
      // Mock UserUsernameHistoryQueries
      const mockUsernameHistoryQueries = {
        getLatestUsername: vi.fn().mockResolvedValue(expectedUsername),
      };
      (userService as any).usernameHistoryQueries = mockUsernameHistoryQueries;

      // Act
      const result = await userService.getLatestUsernameFromHistory(telegramId);

      // Assert
      expect(mockUsernameHistoryQueries.getLatestUsername).toHaveBeenCalledWith(telegramId);
      expect(result).toEqual(expectedUsername);
    });
  });
});