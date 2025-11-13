/**
 * EXAMPLE TEST FILE - Auth Service
 *
 * This is a complete example demonstrating test patterns and best practices.
 * Use this as a reference when writing tests for other services.
 *
 * NOTE: This is an example file and not run in the actual test suite.
 * The real auth.service.spec.ts will be created in src/auth/ directory.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { DbService } from '../../src/db/db.service';
import { createMockDbService } from '../mocks';
import { UserBuilder } from '../builders';
import {
  TEST_TENANT_ID,
  TEST_USER_ID,
  VALID_SESSION_TOKEN,
} from '../constants';

/**
 * Example test suite for AuthService
 * Demonstrates:
 * - Proper test structure
 * - Mock setup and usage
 * - Test builders
 * - Arrange-Act-Assert pattern
 * - Error handling tests
 * - Edge case coverage
 */
describe('AuthService (Example)', () => {
  let service: AuthService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  beforeEach(async () => {
    // Create mock dependencies
    mockDbService = createMockDbService();

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    // Get service instance
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    // Clean up mocks after each test
    jest.clearAllMocks();
  });

  // Sanity check
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Group related tests using describe blocks
   */
  describe('login', () => {
    /**
     * PATTERN: Happy path test
     * - Test the main success scenario
     * - Use descriptive test names
     * - Follow Arrange-Act-Assert
     */
    it('should return session token when credentials are valid', async () => {
      // Arrange: Set up test data
      const email = 'user@example.com';
      const password = 'correct-password';
      const expectedUser = new UserBuilder()
        .withEmail(email)
        .withId(TEST_USER_ID)
        .build();

      // Mock database responses
      mockDbService.drizzle
        .select()
        .from()
        .where.mockResolvedValue([expectedUser]);

      mockDbService.drizzle
        .insert()
        .values.mockResolvedValue([{ sessionToken: VALID_SESSION_TOKEN }]);

      // Act: Call the method
      const result = await service.login(email, password);

      // Assert: Verify results
      expect(result).toHaveProperty('sessionToken');
      expect(result.sessionToken).toBe(VALID_SESSION_TOKEN);
      expect(result.user.id).toBe(TEST_USER_ID);
      expect(mockDbService.drizzle.select).toHaveBeenCalled();
      expect(mockDbService.drizzle.insert).toHaveBeenCalled();
    });

    /**
     * PATTERN: Error handling test
     * - Test all error conditions
     * - Use expect().rejects.toThrow()
     * - Verify specific error types
     */
    it('should throw UnauthorizedException when email not found', async () => {
      // Arrange: Mock empty result (user not found)
      mockDbService.drizzle.select().from().where.mockResolvedValue([]);

      // Act & Assert: Expect error
      await expect(
        service.login('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);

      // Verify database was queried
      expect(mockDbService.drizzle.select).toHaveBeenCalled();

      // Verify session was NOT created
      expect(mockDbService.drizzle.insert).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      const user = new UserBuilder()
        .withEmail('user@example.com')
        .build();

      mockDbService.drizzle.select().from().where.mockResolvedValue([user]);

      // Act & Assert
      await expect(
        service.login('user@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      // Verify session was NOT created
      expect(mockDbService.drizzle.insert).not.toHaveBeenCalled();
    });

    /**
     * PATTERN: Edge case testing
     * - Test boundary conditions
     * - Test special cases
     */
    it('should handle case-insensitive email lookup', async () => {
      // Arrange
      const user = new UserBuilder()
        .withEmail('user@example.com')
        .build();

      mockDbService.drizzle
        .select()
        .from()
        .where.mockResolvedValue([user]);

      mockDbService.drizzle
        .insert()
        .values.mockResolvedValue([{ sessionToken: VALID_SESSION_TOKEN }]);

      // Act: Login with uppercase email
      const result = await service.login('USER@EXAMPLE.COM', 'password');

      // Assert: Should work
      expect(result).toHaveProperty('sessionToken');
    });

    it('should create session with correct expiry', async () => {
      // Arrange
      const user = new UserBuilder().build();
      const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      mockDbService.drizzle.select().from().where.mockResolvedValue([user]);

      const mockInsert = mockDbService.drizzle.insert().values;
      mockInsert.mockResolvedValue([{ sessionToken: VALID_SESSION_TOKEN }]);

      // Act
      await service.login(user.email, 'password');

      // Assert: Verify session data passed to insert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          tenantId: user.tenantId,
          expiresAt: expect.any(Date),
        }),
      );

      // Verify expiry is approximately 30 days
      const insertCall = mockInsert.mock.calls[0][0];
      const expiryDiff = insertCall.expiresAt - new Date();
      expect(expiryDiff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(expiryDiff).toBeLessThan(31 * 24 * 60 * 60 * 1000);
    });
  });

  describe('logout', () => {
    it('should invalidate session in database', async () => {
      // Arrange
      const sessionToken = VALID_SESSION_TOKEN;

      mockDbService.drizzle
        .delete()
        .from()
        .where.mockResolvedValue([{ id: 'session-1' }]);

      // Act
      await service.logout(sessionToken);

      // Assert
      expect(mockDbService.drizzle.delete).toHaveBeenCalled();
      expect(mockDbService.drizzle.where).toHaveBeenCalledWith(
        expect.anything(), // sessionToken matcher
      );
    });

    it('should not throw error when session not found', async () => {
      // Arrange: Session already deleted or doesn't exist
      mockDbService.drizzle.delete().from().where.mockResolvedValue([]);

      // Act & Assert: Should not throw
      await expect(
        service.logout('invalid-token'),
      ).resolves.not.toThrow();
    });
  });

  describe('validateSession', () => {
    /**
     * PATTERN: Test with multiple scenarios
     * - Valid session
     * - Expired session
     * - Invalid session
     */
    it('should return user and tenant when session is valid', async () => {
      // Arrange
      const user = new UserBuilder().build();
      const session = {
        id: 'session-1',
        userId: user.id,
        tenantId: TEST_TENANT_ID,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      };

      mockDbService.drizzle
        .select()
        .from()
        .where.mockResolvedValueOnce([session]) // First query: session
        .mockResolvedValueOnce([user]); // Second query: user

      // Act
      const result = await service.validateSession(VALID_SESSION_TOKEN);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenantId');
      expect(result.user.id).toBe(user.id);
      expect(result.tenantId).toBe(TEST_TENANT_ID);
    });

    it('should return null when session is expired', async () => {
      // Arrange: Expired session
      const session = {
        id: 'session-1',
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };

      mockDbService.drizzle.select().from().where.mockResolvedValue([session]);

      // Act
      const result = await service.validateSession(VALID_SESSION_TOKEN);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when session not found', async () => {
      // Arrange: No session found
      mockDbService.drizzle.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.validateSession('invalid-token');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should generate new session token', async () => {
      // Arrange
      const oldToken = 'old-token';
      const newToken = 'new-token';
      const session = {
        id: 'session-1',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };

      mockDbService.drizzle.select().from().where.mockResolvedValue([session]);

      mockDbService.drizzle
        .update()
        .set()
        .where.mockResolvedValue([{ sessionToken: newToken }]);

      // Act
      const result = await service.refresh(oldToken);

      // Assert
      expect(result.sessionToken).toBe(newToken);
      expect(mockDbService.drizzle.update).toHaveBeenCalled();
    });

    it('should throw error when refresh token is expired', async () => {
      // Arrange: Expired refresh token
      mockDbService.drizzle.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  /**
   * PATTERN: Testing with different user roles
   * Use test builders to create different user types
   */
  describe('login - multi-tenant scenarios', () => {
    it('should use first active membership when tenant not specified', async () => {
      // Arrange: User with multiple tenants
      const user = new UserBuilder().build();
      const memberships = [
        { tenantId: 'tenant-1', status: 'active' },
        { tenantId: 'tenant-2', status: 'active' },
      ];

      mockDbService.drizzle
        .select()
        .from()
        .where.mockResolvedValueOnce([user]) // User query
        .mockResolvedValueOnce(memberships); // Memberships query

      mockDbService.drizzle
        .insert()
        .values.mockResolvedValue([{ sessionToken: VALID_SESSION_TOKEN }]);

      // Act
      const result = await service.login(user.email, 'password');

      // Assert: Should use first tenant
      expect(result.tenantId).toBe('tenant-1');
    });

    it('should use specified tenant when provided', async () => {
      // Arrange
      const user = new UserBuilder().build();
      const memberships = [
        { tenantId: 'tenant-1', status: 'active' },
        { tenantId: 'tenant-2', status: 'active' },
      ];

      mockDbService.drizzle
        .select()
        .from()
        .where.mockResolvedValueOnce([user])
        .mockResolvedValueOnce(memberships);

      mockDbService.drizzle
        .insert()
        .values.mockResolvedValue([{ sessionToken: VALID_SESSION_TOKEN }]);

      // Act: Specify tenant-2
      const result = await service.login(user.email, 'password', {
        tenantId: 'tenant-2',
      });

      // Assert
      expect(result.tenantId).toBe('tenant-2');
    });

    it('should throw error when user has no active memberships', async () => {
      // Arrange
      const user = new UserBuilder().build();

      mockDbService.drizzle
        .select()
        .from()
        .where.mockResolvedValueOnce([user])
        .mockResolvedValueOnce([]); // No memberships

      // Act & Assert
      await expect(
        service.login(user.email, 'password'),
      ).rejects.toThrow('No active tenant membership');
    });
  });

  /**
   * PATTERN: Testing business rules
   * Verify complex business logic
   */
  describe('login - security rules', () => {
    it('should not reveal whether email or password was wrong', async () => {
      // Arrange: Both scenarios should return same error
      mockDbService.drizzle.select().from().where.mockResolvedValue([]);

      let error1: any;
      let error2: any;

      // Act: Try invalid email
      try {
        await service.login('invalid@example.com', 'password');
      } catch (e) {
        error1 = e;
      }

      // Act: Try invalid password
      const user = new UserBuilder().build();
      mockDbService.drizzle.select().from().where.mockResolvedValue([user]);

      try {
        await service.login(user.email, 'wrong-password');
      } catch (e) {
        error2 = e;
      }

      // Assert: Same error message for security
      expect(error1.message).toBe(error2.message);
      expect(error1).toBeInstanceOf(UnauthorizedException);
      expect(error2).toBeInstanceOf(UnauthorizedException);
    });
  });
});
