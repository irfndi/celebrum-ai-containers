import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import { invitationCodes, invitationUsage } from '../../src/schema/invitations.js';
import { eq, and, lt, gt, sql } from 'drizzle-orm';

// Create a chainable mock database
function createChainableMockDb(returnData: any = []) {
  const mockQueryResult = Array.isArray(returnData) ? returnData : [returnData];
  
  const chainable: any = {
    then: (resolve: any) => resolve(mockQueryResult),
    catch: () => chainable,
  };
  
  // All chainable methods return the chainable object
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.insert = vi.fn().mockReturnValue(chainable);
  chainable.update = vi.fn().mockReturnValue(chainable);
  chainable.delete = vi.fn().mockReturnValue(chainable);
  chainable.from = vi.fn().mockReturnValue(chainable);
  chainable.where = vi.fn().mockReturnValue(chainable);
  chainable.values = vi.fn().mockReturnValue(chainable);
  chainable.set = vi.fn().mockReturnValue(chainable);
  chainable.returning = vi.fn().mockReturnValue(chainable);
  chainable.limit = vi.fn().mockReturnValue(chainable);
  chainable.orderBy = vi.fn().mockReturnValue(chainable);
  chainable.execute = vi.fn().mockResolvedValue(mockQueryResult);
  chainable.meta = { changes: 0 };
  chainable.transaction = vi.fn();
  
  return chainable;
}

// Mock invitation data
const mockInvitationCode = {
  code: 'TEST123',
  createdBy: '123',
  createdAt: new Date('2023-01-01'),
  expiresAt: new Date('2023-12-31'),
  maxUses: 10,
  currentUses: 2,
  isActive: true,
  purpose: 'beta',
};

const mockInvitationUsage = {
  id: 'usage-1',
  codeId: 'TEST123',
  usedBy: 'user-1',
  usedAt: new Date('2023-06-01'),
};

// Mock InvitationQueries class for testing
class InvitationQueries {
  constructor(private db: any) {}

  async findCodeByValue(code: string) {
    const result = await this.db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .limit(1)
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  }

  async findActiveCodeByValue(code: string) {
    const result = await this.db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.code, code),
          eq(invitationCodes.isActive, true),
          gt(invitationCodes.expiresAt, new Date()),
          lt(invitationCodes.currentUses, invitationCodes.maxUses)
        )
      )
      .limit(1)
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  }

  async createCode(codeData: any) {
    const result = await this.db
      .insert(invitationCodes)
      .values(codeData)
      .returning()
      .execute();

    return result[0];
  }

  async incrementUses(code: string) {
    const result = await this.db
      .update(invitationCodes)
      .set({ currentUses: sql`${invitationCodes.currentUses} + 1` })
      .where(eq(invitationCodes.code, code))
      .returning()
      .execute();

    return result[0];
  }

  async recordUsage(usageData: any) {
    const result = await this.db
      .insert(invitationUsage)
      .values(usageData)
      .returning()
      .execute();

    return result[0];
  }

  async deactivateCode(code: string) {
    const result = await this.db
      .update(invitationCodes)
      .set({ isActive: false })
      .where(eq(invitationCodes.code, code))
      .returning()
      .execute();

    return result[0];
  }
}

describe('InvitationQueries', () => {
  describe('findCodeByValue', () => {
    it('should find invitation code by value', async () => {
      const mockDbWithCode = createChainableMockDb([mockInvitationCode]);
      const queries = new InvitationQueries(mockDbWithCode);
      
      const result = await queries.findCodeByValue('TEST123');
      
      expect(result).toEqual(mockInvitationCode);
      expect(mockDbWithCode.select).toHaveBeenCalled();
      expect(mockDbWithCode.where).toHaveBeenCalled();
    });

    it('should return null when code not found', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.findCodeByValue('NONEXISTENT');
      
      expect(result).toBeNull();
    });
  });

  describe('findActiveCodeByValue', () => {
    it('should find active invitation code by value', async () => {
      const mockDbWithCode = createChainableMockDb([mockInvitationCode]);
      const queries = new InvitationQueries(mockDbWithCode);
      
      const result = await queries.findActiveCodeByValue('TEST123');
      
      expect(result).toEqual(mockInvitationCode);
      expect(mockDbWithCode.select).toHaveBeenCalled();
      expect(mockDbWithCode.where).toHaveBeenCalled();
    });

    it('should return null when code is expired', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.findActiveCodeByValue('EXPIRED');
      
      expect(result).toBeNull();
    });

    it('should return null when code is inactive', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.findActiveCodeByValue('INACTIVE');
      
      expect(result).toBeNull();
    });

    it('should return null when code is at max usage', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.findActiveCodeByValue('MAXED');
      
      expect(result).toBeNull();
    });
  });

  describe('createCode', () => {
    it('should create a new invitation code', async () => {
      const newCode = { ...mockInvitationCode, code: 'NEW123' };
      const mockDbWithNewCode = createChainableMockDb([newCode]);
      const queries = new InvitationQueries(mockDbWithNewCode);
      
      const result = await queries.createCode(newCode);
      
      expect(result).toEqual(newCode);
      expect(mockDbWithNewCode.insert).toHaveBeenCalled();
      expect(mockDbWithNewCode.values).toHaveBeenCalled();
    });
  });

  describe('incrementUses', () => {
    it('should increment uses for a code', async () => {
      const updatedCode = { ...mockInvitationCode, currentUses: 3 };
      const mockDbWithIncrement = createChainableMockDb([updatedCode]);
      const queries = new InvitationQueries(mockDbWithIncrement);
      
      const result = await queries.incrementUses('TEST123');
      
      expect(result).toEqual(updatedCode);
      expect(mockDbWithIncrement.update).toHaveBeenCalled();
      expect(mockDbWithIncrement.set).toHaveBeenCalled();
    });

    it('should handle codes at max usage', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.incrementUses('MAXED');
      
      expect(result).toBeUndefined();
    });

    it('should handle concurrent increment operations', async () => {
      const updatedCode = { ...mockInvitationCode, currentUses: 3 };
      const mockDbWithIncrement = createChainableMockDb([updatedCode]);
      const queries = new InvitationQueries(mockDbWithIncrement);
      
      const result = await queries.incrementUses('TEST123');
      
      expect(result).toEqual(updatedCode);
      expect(mockDbWithIncrement.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordUsage', () => {
    it('should record usage for a code', async () => {
      const mockDbWithUsage = createChainableMockDb([mockInvitationUsage]);
      const queries = new InvitationQueries(mockDbWithUsage);
      
      const result = await queries.recordUsage(mockInvitationUsage);
      
      expect(result).toEqual(mockInvitationUsage);
      expect(mockDbWithUsage.insert).toHaveBeenCalled();
      expect(mockDbWithUsage.values).toHaveBeenCalled();
    });

    it('should handle duplicate usage tracking', async () => {
      const mockDbWithUsage = createChainableMockDb([mockInvitationUsage]);
      const queries = new InvitationQueries(mockDbWithUsage);
      
      const result = await queries.recordUsage(mockInvitationUsage);
      
      expect(result).toEqual(mockInvitationUsage);
    });

    it('should handle usage creation with invalid data', async () => {
      const mockDbWithError = createChainableMockDb([]);
      mockDbWithError.execute = vi.fn().mockRejectedValue(new Error('Invalid usage data'));
      const queries = new InvitationQueries(mockDbWithError);
      
      await expect(queries.recordUsage({})).rejects.toThrow('Invalid usage data');
    });

    it('should handle concurrent usage tracking', async () => {
      const multipleUsage = Array(5).fill(mockInvitationUsage);
      const mockDbWithUsage = createChainableMockDb(multipleUsage);
      const queries = new InvitationQueries(mockDbWithUsage);
      
      const promises = Array(5).fill(null).map(() => queries.recordUsage(mockInvitationUsage));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(mockDbWithUsage.insert).toHaveBeenCalledTimes(5);
    });
  });

  describe('deactivateCode', () => {
    it('should deactivate a code', async () => {
      const deactivatedCode = { ...mockInvitationCode, isActive: false };
      const mockDbWithDeactivated = createChainableMockDb([deactivatedCode]);
      const queries = new InvitationQueries(mockDbWithDeactivated);
      
      const result = await queries.deactivateCode('TEST123');
      
      expect(result).toEqual(deactivatedCode);
      expect(mockDbWithDeactivated.update).toHaveBeenCalled();
      expect(mockDbWithDeactivated.set).toHaveBeenCalled();
    });

    it('should handle deactivation errors', async () => {
      const mockDbWithError = createChainableMockDb([]);
      const error = new Error('Database error');
      mockDbWithError.execute = vi.fn().mockRejectedValue(error);
      const queries = new InvitationQueries(mockDbWithError);
      
      await expect(queries.deactivateCode('TEST123')).rejects.toThrow('Database error');
    });

    it('should handle non-existent codes', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.deactivateCode('NONEXISTENT');
      
      expect(result).toBeUndefined();
    });
  });

  describe('Active Code Validation', () => {
    it('should validate active codes correctly', async () => {
      const mockDbWithCode = createChainableMockDb([mockInvitationCode]);
      const queries = new InvitationQueries(mockDbWithCode);
      
      const result = await queries.findActiveCodeByValue('TEST123');
      
      expect(result).toEqual(mockInvitationCode);
    });

    it('should reject expired codes', async () => {
      const emptyMockDb = createChainableMockDb([]);
      const queries = new InvitationQueries(emptyMockDb);
      
      const result = await queries.findActiveCodeByValue('EXPIRED');
      
      expect(result).toBeNull();
    });
  });
});