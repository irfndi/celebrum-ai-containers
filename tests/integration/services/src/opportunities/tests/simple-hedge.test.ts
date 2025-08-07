import { describe, it, expect, vi } from 'vitest';

// Simple test without complex imports to verify test infrastructure
describe('Simple Hedge Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with mocks', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue('test');
    
    expect(mockFn()).toBe('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});