import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertUser } from '../../src/user.service';
import { users } from '../../../db/src/schema';
import { mockUser } from '../../../tests/fixtures/users';

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
} as any;

vi.mock('../../../db/src/index', () => ({
  // This mock is now unused but kept to avoid breaking other tests that might rely on it.
  // The actual mock is passed directly to the function.
}));

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks on the mockDb instance before each test
    vi.spyOn(mockDb, 'insert').mockReturnThis();
    vi.spyOn(mockDb, 'values').mockReturnThis();
    vi.spyOn(mockDb, 'onConflictDoUpdate').mockReturnThis();
    vi.spyOn(mockDb, 'returning').mockClear();
  });

  describe('upsertUser', () => {
    it('should upsert a user and return the user data', async () => {
      const returning = {
        ...mockUser,
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(mockDb, 'returning').mockResolvedValue([returning]);

      const result = await upsertUser(mockDb, mockUser);

      expect(mockDb.insert).toHaveBeenCalledWith(users);
      expect(mockDb.values).toHaveBeenCalledWith(mockUser);
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
      expect(result).toEqual([returning]);
    });

    it('should throw an error if the database operation fails', async () => {
      const error = new Error('Database error');
      vi.spyOn(mockDb, 'returning').mockRejectedValue(error);

      await expect(upsertUser(mockDb, mockUser)).rejects.toThrow(error);
    });
  });
});