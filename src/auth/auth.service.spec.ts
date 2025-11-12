import { vi, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { DbService } from '../db/db.service';
import * as passwordUtil from './password.util';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * AuthService Unit Tests
 * Tests authentication logic, session management, and security features
 * Target Coverage: 100%
 */
describe('AuthService', () => {
  let service: AuthService;
  let sessionsService: vi.Mocked<SessionsService>;
  let mockDbService: ReturnType<typeof createMockDbService>;

  // Test data
  const validUser = {
    id: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$dummyhash',
    lastLoginAt: null,
  };

  const validMembership = {
    id: 'membership-1',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: 'employee',
    status: 'active',
  };

  const validSession = {
    id: 'session-1',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    token: 'valid-token-123',
    refreshToken: 'refresh-token-123',
    expiresAt: new Date(Date.now() + 86400000), // 1 day from now
    refreshExpiresAt: new Date(Date.now() + 7776000000), // 90 days
  };

  beforeEach(async () => {
    // Mock SessionsService
    sessionsService = {
      createSession: vi.fn(),
      findByToken: vi.fn(),
      refreshSession: vi.fn(),
      deleteSession: vi.fn(),
      touchSession: vi.fn(),
    } as any;

    // Mock DbService
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SessionsService, useValue: sessionsService },
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      // Mock password verification
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);
    });

    it('should authenticate user with valid credentials', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser]) // User query
        .mockResolvedValueOnce([validMembership]); // Memberships query

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue(validSession);

      // Act
      const result = await service.login(loginDto, '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(result.user.id).toBe(TEST_USER_ID);
      expect(result.user.email).toBe('test@example.com');
      expect(result.tenant.id).toBe(TEST_TENANT_ID);
    });

    it('should pass IP address and user agent to session creation', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]);

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue(validSession);

      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      // Act
      await service.login(loginDto, ipAddress, userAgent);

      // Assert
      expect(sessionsService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          ipAddress,
          userAgent,
        }),
      );
    });

    it('should throw UnauthorizedException when email not found', async () => {
      // Arrange: User not found
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');

      // Verify session was not created
      expect(sessionsService.createSession).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no password hash', async () => {
      // Arrange: User without password
      const userWithoutPassword = { ...validUser, passwordHash: null };
      mockDbService.db.select().from().where.mockResolvedValue([userWithoutPassword]);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([validUser]);
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');

      // Verify session was not created
      expect(sessionsService.createSession).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no active memberships', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser]) // User found
        .mockResolvedValueOnce([]); // No memberships

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'No active tenant memberships found',
      );
    });

    it('should use first active membership when tenantId not specified', async () => {
      // Arrange: User with multiple tenants
      const memberships = [
        { ...validMembership, tenantId: 'tenant-1' },
        { ...validMembership, tenantId: 'tenant-2' },
      ];

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce(memberships);

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue({
        ...validSession,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await service.login(loginDto);

      // Assert: Should use first tenant
      expect(result.tenant.id).toBe('tenant-1');
      expect(sessionsService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
        }),
      );
    });

    it('should use specified tenantId when provided', async () => {
      // Arrange
      const memberships = [
        { ...validMembership, tenantId: 'tenant-1' },
        { ...validMembership, tenantId: 'tenant-2' },
      ];

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce(memberships);

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue({
        ...validSession,
        tenantId: 'tenant-2',
      });

      const dtoWithTenant = { ...loginDto, tenantId: 'tenant-2' };

      // Act
      const result = await service.login(dtoWithTenant);

      // Assert
      expect(result.tenant.id).toBe('tenant-2');
    });

    it('should throw BadRequestException when user lacks access to specified tenant', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]); // Only has access to TEST_TENANT_ID

      const dtoWithInvalidTenant = { ...loginDto, tenantId: 'unauthorized-tenant' };

      // Act & Assert
      await expect(service.login(dtoWithInvalidTenant)).rejects.toThrow(BadRequestException);
      await expect(service.login(dtoWithInvalidTenant)).rejects.toThrow(
        'User does not have access to the specified tenant',
      );
    });

    it('should update user last login timestamp', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]);

      const mockUpdate = mockDbService.db.update().set().where;
      mockUpdate.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue(validSession);

      // Act
      await service.login(loginDto);

      // Assert
      expect(mockDbService.db.update).toHaveBeenCalled();
      expect(mockDbService.db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should return token and refresh token from session', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]);

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue(validSession);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result.token).toBe('valid-token-123');
      expect(result.refreshToken).toBe('refresh-token-123');
      expect(result.expiresAt).toEqual(validSession.expiresAt);
    });

    it('should only return safe user fields', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]);

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      sessionsService.createSession.mockResolvedValue(validSession);

      // Act
      const result = await service.login(loginDto);

      // Assert: Should not expose sensitive fields
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('refresh', () => {
    it('should refresh session with valid refresh token', async () => {
      // Arrange
      const newSession = {
        ...validSession,
        token: 'new-token-456',
        refreshToken: 'new-refresh-token-456',
      };

      sessionsService.refreshSession.mockResolvedValue(newSession);

      mockDbService.db.select().from().where.mockResolvedValue([validUser]);

      // Act
      const result = await service.refresh('refresh-token-123');

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.token).toBe('new-token-456');
      expect(result.refreshToken).toBe('new-refresh-token-456');
      expect(result.user.id).toBe(TEST_USER_ID);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange: Session service returns null for invalid token
      sessionsService.refreshSession.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      sessionsService.refreshSession.mockResolvedValue(validSession);
      mockDbService.db.select().from().where.mockResolvedValue([]); // User not found

      // Act & Assert
      await expect(service.refresh('refresh-token-123')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('refresh-token-123')).rejects.toThrow('User not found');
    });

    it('should return user and tenant information', async () => {
      // Arrange
      sessionsService.refreshSession.mockResolvedValue(validSession);
      mockDbService.db.select().from().where.mockResolvedValue([validUser]);

      // Act
      const result = await service.refresh('refresh-token-123');

      // Assert
      expect(result.user).toEqual({
        id: validUser.id,
        email: validUser.email,
        name: validUser.name,
      });
      expect(result.tenant).toEqual({
        id: validSession.tenantId,
      });
    });

    it('should return new expiry time from refreshed session', async () => {
      // Arrange
      const futureExpiry = new Date(Date.now() + 2592000000); // 30 days
      const refreshedSession = {
        ...validSession,
        expiresAt: futureExpiry,
      };

      sessionsService.refreshSession.mockResolvedValue(refreshedSession);
      mockDbService.db.select().from().where.mockResolvedValue([validUser]);

      // Act
      const result = await service.refresh('refresh-token-123');

      // Assert
      expect(result.expiresAt).toEqual(futureExpiry);
    });
  });

  describe('logout', () => {
    it('should delete session on logout', async () => {
      // Arrange
      sessionsService.deleteSession.mockResolvedValue(undefined);

      // Act
      await service.logout('valid-token-123');

      // Assert
      expect(sessionsService.deleteSession).toHaveBeenCalledWith('valid-token-123');
      expect(sessionsService.deleteSession).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when session does not exist', async () => {
      // Arrange
      sessionsService.deleteSession.mockResolvedValue(undefined);

      // Act & Assert: Should not throw
      await expect(service.logout('non-existent-token')).resolves.not.toThrow();
      expect(sessionsService.deleteSession).toHaveBeenCalledWith('non-existent-token');
    });

    it('should complete successfully without return value', async () => {
      // Arrange
      sessionsService.deleteSession.mockResolvedValue(undefined);

      // Act
      const result = await service.logout('valid-token-123');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('should return session data when token is valid', async () => {
      // Arrange
      const sessionData = {
        id: 'session-1',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: 'valid-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 86400000),
        refreshExpiresAt: new Date(Date.now() + 7776000000),
      };

      sessionsService.findByToken.mockResolvedValue(sessionData);
      sessionsService.touchSession.mockResolvedValue(undefined);

      // Act
      const result = await service.validateSession('valid-token-123');

      // Assert
      expect(result).toEqual(sessionData);
      expect(sessionsService.findByToken).toHaveBeenCalledWith('valid-token-123');
    });

    it('should touch session to update last used timestamp', async () => {
      // Arrange
      const sessionData = {
        id: 'session-1',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: 'valid-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 86400000),
        refreshExpiresAt: new Date(Date.now() + 7776000000),
      };

      sessionsService.findByToken.mockResolvedValue(sessionData);
      sessionsService.touchSession.mockResolvedValue(undefined);

      // Act
      await service.validateSession('valid-token-123');

      // Assert
      expect(sessionsService.touchSession).toHaveBeenCalledWith('valid-token-123');
    });

    it('should return null when session not found', async () => {
      // Arrange
      sessionsService.findByToken.mockResolvedValue(null);

      // Act
      const result = await service.validateSession('invalid-token');

      // Assert
      expect(result).toBeNull();
      expect(sessionsService.touchSession).not.toHaveBeenCalled();
    });

    it('should return null when session is expired', async () => {
      // Arrange: findByToken handles expiry checking internally
      sessionsService.findByToken.mockResolvedValue(null);

      // Act
      const result = await service.validateSession('expired-token');

      // Assert
      expect(result).toBeNull();
    });

    it('should not touch session when session is invalid', async () => {
      // Arrange
      sessionsService.findByToken.mockResolvedValue(null);

      // Act
      await service.validateSession('invalid-token');

      // Assert
      expect(sessionsService.touchSession).not.toHaveBeenCalled();
    });
  });
});
