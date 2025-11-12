/**
 * Mock factory for Drizzle ORM query builder
 * Provides a chainable mock that mimics Drizzle's query API
 */

import { vi } from 'vitest';

/**
 * Creates a mock Drizzle instance with chainable query methods
 *
 * @example
 * const mockDrizzle = createMockDrizzle();
 * mockDrizzle.select().from().where.mockResolvedValue([{ id: '1' }]);
 */
export function createMockDrizzle() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  return mockChain;
}

/**
 * Creates a mock Drizzle with transaction support
 *
 * @example
 * const mockDrizzle = createMockDrizzleWithTransaction();
 * mockDrizzle.transaction.mockImplementation(async (callback) => {
 *   return callback(mockDrizzle);
 * });
 */
export function createMockDrizzleWithTransaction() {
  const mockDrizzle = createMockDrizzle();

  return {
    ...mockDrizzle,
    transaction: vi.fn().mockImplementation(async (callback) => {
      return callback(mockDrizzle);
    }),
  };
}
