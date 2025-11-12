/**
 * Mock factory for DbService
 * Provides a mocked database service for testing
 */

import { createMockDrizzle, createMockDrizzleWithTransaction } from './drizzle.mock';

/**
 * Creates a mock DbService with mocked Drizzle instance
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
  return {
    drizzle: createMockDrizzle(),
  };
}

/**
 * Creates a mock DbService with transaction support
 *
 * @example
 * const mockDbService = createMockDbServiceWithTransaction();
 * mockDbService.drizzle.transaction.mockImplementation(async (callback) => {
 *   return callback(mockDbService.drizzle);
 * });
 */
export function createMockDbServiceWithTransaction() {
  return {
    drizzle: createMockDrizzleWithTransaction(),
  };
}
