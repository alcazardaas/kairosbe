/**
 * Global test setup file
 * Loaded before all tests via vitest.config.ts
 */

import 'reflect-metadata'; // Required for NestJS dependency injection
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-secret-key-for-unit-tests';
process.env.SESSION_TTL = '2592000'; // 30 days
process.env.REFRESH_TOKEN_TTL = '7776000'; // 90 days
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'silent'; // Suppress logs in tests

// Global test timeout (10 seconds)
vi.setConfig({ testTimeout: 10000 });

// Optionally mock console methods to reduce test noise
// Uncomment if needed
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
//   log: vi.fn(),
// };
