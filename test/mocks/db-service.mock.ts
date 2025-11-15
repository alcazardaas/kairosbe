import { vi } from 'vitest';
/**
 * Mock factory for DbService
 * Provides a mocked database service for testing
 */

import { createMockDrizzle, createMockDrizzleWithTransaction } from './drizzle.mock';

/**
 * Creates a mock DbService with mocked Drizzle instance
 * Supports both direct `db` property access and `getDb()` method
 *
 * @example
 * const mockDbService = createMockDbService();
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     { provide: DbService, useValue: mockDbService },
 *   ],
 * }).compile();
 */
export function createMockDbService() {
  const mockDrizzle = createMockDrizzle();

  return {
    db: mockDrizzle,
    getDb: vi.fn(() => mockDrizzle),
  };
}

/**
 * Creates a mock DbService with transaction support
 *
 * @example
 * const mockDbService = createMockDbServiceWithTransaction();
 * mockDbService.db.transaction.mockImplementation(async (callback) => {
 *   return callback(mockDbService.db);
 * });
 */
export function createMockDbServiceWithTransaction() {
  const mockDrizzle = createMockDrizzleWithTransaction();

  return {
    db: mockDrizzle,
    getDb: vi.fn(() => mockDrizzle),
  };
}
