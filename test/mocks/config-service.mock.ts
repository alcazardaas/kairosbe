import { vi } from 'vitest';

/**
 * Mock factory for ConfigService
 * Provides a mocked configuration service for testing
 */

/**
 * Creates a mock ConfigService with default configuration values
 *
 * @param overrides - Optional configuration overrides
 * @example
 * const mockConfigService = createMockConfigService();
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     { provide: ConfigService, useValue: mockConfigService },
 *   ],
 * }).compile();
 */
export function createMockConfigService(overrides: Record<string, any> = {}) {
  const defaultConfig = {
    SESSION_TTL: 2592000, // 30 days in seconds
    REFRESH_TOKEN_TTL: 7776000, // 90 days in seconds
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
    PORT: 3000,
    LOG_LEVEL: 'error',
    ...overrides,
  };

  return {
    get: vi.fn((key: string, defaultValue?: any) => {
      return defaultConfig[key] ?? defaultValue;
    }),
    getOrThrow: vi.fn((key: string) => {
      if (!(key in defaultConfig)) {
        throw new Error(`Configuration key "${key}" not found`);
      }
      return defaultConfig[key];
    }),
  };
}
