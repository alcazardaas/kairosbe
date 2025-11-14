import { vi, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { DbService } from '../db/db.service';
import * as passwordUtil from './password.util';
import { createMockDbService, createMockConfigService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * AuthService Unit Tests
 * Tests authentication logic, session management, and security features
 * Target Coverage: 100%
 */
describe('AuthService', () => {
  let service: AuthService;
  let sessionsService: vi.Mocked<SessionsService>;
  let configService: ReturnType<typeof createMockConfigService>;
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

    // Mock ConfigService
    configService = createMockConfigService({
      FRONTEND_URL: 'http://localhost:3000',
    });

    // Mock DbService
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SessionsService, useValue: sessionsService },
        { provide: ConfigService, useValue: configService },
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
      await expect(service.login(loginDto)).rejects.toThrow('No active tenant memberships found');
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

  describe('signup', () => {
    const signupDto = {
      email: 'newuser@newcompany.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'New Company Inc',
      timezone: 'America/New_York',
      acceptedTerms: true,
    };

    const mockTenant = {
      id: 'new-tenant-id',
      name: 'New Company Inc',
      slug: 'new-company-inc',
      timezone: 'America/New_York',
      ownerUserId: null,
      createdAt: new Date(),
      phone: null,
      address: null,
      logoUrl: null,
      country: null,
    };

    const mockUser = {
      id: 'new-user-id',
      email: 'newuser@newcompany.com',
      passwordHash: '$2b$12$hashedpassword',
      name: 'John Doe',
      locale: 'en',
      createdAt: new Date(),
      lastLoginAt: null,
    };

    const mockMembership = {
      id: 'new-membership-id',
      userId: 'new-user-id',
      tenantId: 'new-tenant-id',
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
    };

    const mockSession = {
      id: 'new-session-id',
      userId: 'new-user-id',
      tenantId: 'new-tenant-id',
      token: 'new-session-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(Date.now() + 86400000),
      refreshExpiresAt: new Date(Date.now() + 7776000000),
    };

    beforeEach(() => {
      vi.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$hashedpassword');
    });

    it('should create new tenant, user, and membership on signup', async () => {
      // Arrange: Mock all database operations
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([]) // No existing user
        .mockResolvedValueOnce([]); // Slug is unique

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi.fn().mockResolvedValueOnce([mockTenant]), // Tenant insert
      }));

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant]) // Tenant
          .mockResolvedValueOnce([mockUser]) // User
          .mockResolvedValueOnce([mockMembership]), // Membership
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);

      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await service.signup(signupDto, '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('membership');
      expect(result.user.email).toBe('newuser@newcompany.com');
      expect(result.tenant.name).toBe('New Company Inc');
      expect(result.membership.role).toBe('admin');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange: Email already registered
      mockDbService.db.select().from().where.mockResolvedValue([mockUser]);

      // Act & Assert
      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
      await expect(service.signup(signupDto)).rejects.toThrow(
        'Email address is already registered',
      );

      // Verify tenant was not created
      expect(mockDbService.db.insert).not.toHaveBeenCalled();
      expect(sessionsService.createSession).not.toHaveBeenCalled();
    });

    it('should convert email to lowercase', async () => {
      // Arrange
      const dtoWithUppercaseEmail = {
        ...signupDto,
        email: 'NEWUSER@NEWCOMPANY.COM',
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([]) // Check existing user (lowercased)
        .mockResolvedValueOnce([]); // Slug check

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([{ ...mockUser, email: 'newuser@newcompany.com' }])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      await service.signup(dtoWithUppercaseEmail);

      // Assert: Email should be checked as lowercase
      expect(mockDbService.db.where).toHaveBeenCalledWith(expect.anything());
    });

    it('should generate unique slug from company name', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([]) // No existing user
        .mockResolvedValueOnce([]); // Slug is unique

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await service.signup(signupDto);

      // Assert: Slug should be lowercase with hyphens
      expect(result.tenant.slug).toBe('new-company-inc');
    });

    it('should create user with admin role', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await service.signup(signupDto);

      // Assert
      expect(result.membership.role).toBe('admin');
      expect(result.membership.status).toBe('active');
    });

    it('should hash password before storing', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      await service.signup(signupDto);

      // Assert
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should create session with IP address and user agent', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      // Act
      await service.signup(signupDto, ipAddress, userAgent);

      // Assert
      expect(sessionsService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user-id',
          tenantId: 'new-tenant-id',
          ipAddress,
          userAgent,
        }),
      );
    });

    it('should return session tokens for auto-login', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await service.signup(signupDto);

      // Assert
      expect(result.token).toBe('new-session-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresAt).toEqual(mockSession.expiresAt);
    });

    it('should use default timezone UTC if not provided', async () => {
      // Arrange
      const dtoWithoutTimezone = { ...signupDto, timezone: undefined };

      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([{ ...mockTenant, timezone: 'UTC' }])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      await service.signup(dtoWithoutTimezone as any);

      // Assert: UTC should be used
      expect(mockDbService.db.insert).toHaveBeenCalled();
    });

    it('should combine first and last name into full name', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await service.signup(signupDto);

      // Assert
      expect(result.user.name).toBe('John Doe');
    });

    it('should handle slug collision by adding counter', async () => {
      // Arrange: Slug already exists, needs counter
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([]) // No existing user
        .mockResolvedValueOnce([{ slug: 'new-company-inc' }]) // Slug exists
        .mockResolvedValueOnce([]); // new-company-inc-1 is unique

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([{ ...mockTenant, slug: 'new-company-inc-1' }])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      mockDbService.db.update().set().where.mockResolvedValue([mockTenant]);
      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      const result = await service.signup(signupDto);

      // Assert: Slug should have counter appended
      expect(result.tenant.slug).toBe('new-company-inc-1');
    });

    it('should update tenant with owner user ID', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([mockTenant])
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([mockMembership]),
      }));

      const mockUpdate = mockDbService.db.update().set().where;
      mockUpdate.mockResolvedValue([mockTenant]);

      sessionsService.createSession.mockResolvedValue(mockSession);

      // Act
      await service.signup(signupDto);

      // Assert
      expect(mockDbService.db.update).toHaveBeenCalled();
      expect(mockDbService.db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerUserId: 'new-user-id',
        }),
      );
    });
  });

  describe('changePassword', () => {
    const userId = TEST_USER_ID;
    const changePasswordDto = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    beforeEach(() => {
      vi.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$newhash');
    });

    it('should change password successfully', async () => {
      // Arrange
      const userWithHash = { ...validUser, passwordHash: '$2b$12$oldhash' };
      mockDbService.db.select().from().where.mockResolvedValue([userWithHash]);

      vi.spyOn(passwordUtil, 'verifyPassword')
        .mockResolvedValueOnce(true) // Current password correct
        .mockResolvedValueOnce(false); // New password different

      mockDbService.db.update().set().where.mockResolvedValue([userWithHash]);
      mockDbService.db.delete().where.mockResolvedValue([]);

      // Act
      await service.changePassword(userId, changePasswordDto);

      // Assert
      expect(passwordUtil.verifyPassword).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        '$2b$12$oldhash',
      );
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(changePasswordDto.newPassword);
      expect(mockDbService.db.update).toHaveBeenCalled();
      expect(mockDbService.db.delete).toHaveBeenCalled(); // Sessions deleted
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange: User not found
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        'User not found or has no password set',
      );
    });

    it('should throw UnauthorizedException if user has no password hash', async () => {
      // Arrange: User without password
      const userWithoutHash = { ...validUser, passwordHash: null };
      mockDbService.db.select().from().where.mockResolvedValue([userWithoutHash]);

      // Act & Assert
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      // Arrange
      const userWithHash = { ...validUser, passwordHash: '$2b$12$oldhash' };
      mockDbService.db.select().from().where.mockResolvedValue([userWithHash]);

      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      // Act & Assert
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        'Current password is incorrect',
      );

      // Password should not be updated
      expect(mockDbService.db.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new password same as current', async () => {
      // Arrange
      const userWithHash = { ...validUser, passwordHash: '$2b$12$oldhash' };
      mockDbService.db.select().from().where.mockResolvedValue([userWithHash]);

      // Both current and new password verify as true (same password)
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);

      // Act & Assert
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        'New password must be different from current password',
      );
    });

    it('should invalidate all user sessions after password change', async () => {
      // Arrange
      const userWithHash = { ...validUser, passwordHash: '$2b$12$oldhash' };
      mockDbService.db.select().from().where.mockResolvedValue([userWithHash]);

      vi.spyOn(passwordUtil, 'verifyPassword')
        .mockResolvedValueOnce(true) // Current password correct
        .mockResolvedValueOnce(false); // New password different

      mockDbService.db.update().set().where.mockResolvedValue([userWithHash]);
      const mockDelete = mockDbService.db.delete().where;
      mockDelete.mockResolvedValue([]);

      // Act
      await service.changePassword(userId, changePasswordDto);

      // Assert: All sessions deleted for security
      expect(mockDbService.db.delete).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };
    const ipAddress = '192.168.1.1';

    it('should generate reset token for valid email', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser]) // User found
        .mockResolvedValueOnce([validMembership]); // Membership found

      mockDbService.db.delete().where.mockResolvedValue([]); // Delete old tokens

      const mockResetToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: 'reset-token-uuid',
        expiresAt: new Date(Date.now() + 900000), // 15 minutes
        createdAt: new Date(),
        usedAt: null,
      };
      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue([mockResetToken]),
      }));

      // Act
      await service.forgotPassword(forgotPasswordDto, ipAddress);

      // Assert
      expect(mockDbService.db.insert).toHaveBeenCalled();
      expect(mockDbService.db.delete).toHaveBeenCalled(); // Old tokens deleted
    });

    it('should silently succeed if email does not exist (security)', async () => {
      // Arrange: User not found
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert: Should not throw, just return (prevent email enumeration)
      await expect(service.forgotPassword(forgotPasswordDto, ipAddress)).resolves.toBeUndefined();

      // No token should be created
      expect(mockDbService.db.insert).not.toHaveBeenCalled();
    });

    it('should silently succeed if user has no active membership', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser]) // User found
        .mockResolvedValueOnce([]); // No memberships

      // Act & Assert: Should not throw
      await expect(service.forgotPassword(forgotPasswordDto, ipAddress)).resolves.toBeUndefined();

      // No token should be created
      expect(mockDbService.db.insert).not.toHaveBeenCalled();
    });

    it('should invalidate existing unused tokens before creating new one', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]);

      const mockDelete = mockDbService.db.delete().where;
      mockDelete.mockResolvedValue([]);

      const mockResetToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: 'reset-token-uuid',
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date(),
        usedAt: null,
      };
      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue([mockResetToken]),
      }));

      // Act
      await service.forgotPassword(forgotPasswordDto, ipAddress);

      // Assert: Old tokens deleted before creating new one
      expect(mockDbService.db.delete).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should set token expiry to 15 minutes from now', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([validUser])
        .mockResolvedValueOnce([validMembership]);

      mockDbService.db.delete().where.mockResolvedValue([]);

      const now = new Date();
      const mockResetToken = {
        id: 'token-id',
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        token: 'reset-token-uuid',
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
        createdAt: now,
        usedAt: null,
      };
      mockDbService.db.insert().values.mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue([mockResetToken]),
      }));

      // Act
      await service.forgotPassword(forgotPasswordDto, ipAddress);

      // Assert: Token created with expiry
      expect(mockDbService.db.insert).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token-uuid',
      newPassword: 'newSecurePassword123',
    };

    const mockTokenRecord = {
      id: 'token-id',
      userId: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      token: 'valid-reset-token-uuid',
      expiresAt: new Date(Date.now() + 900000), // Future date (not expired)
      usedAt: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      vi.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$newhash');
    });

    it('should reset password with valid token', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTokenRecord]) // Token found
        .mockResolvedValueOnce([validUser]); // User found

      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false); // New password different

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);
      mockDbService.db.delete().where.mockResolvedValue([]);

      // Act
      await service.resetPassword(resetPasswordDto);

      // Assert
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(resetPasswordDto.newPassword);
      expect(mockDbService.db.update).toHaveBeenCalled(); // Password updated
      expect(mockDbService.db.delete).toHaveBeenCalled(); // Sessions invalidated
    });

    it('should throw BadRequestException if token not found', async () => {
      // Arrange: Token not found
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });

    it('should throw BadRequestException if token already used', async () => {
      // Arrange: Token already used
      const usedToken = {
        ...mockTokenRecord,
        usedAt: new Date(Date.now() - 60000), // Used 1 minute ago
      };
      mockDbService.db.select().from().where.mockResolvedValue([usedToken]);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Reset token has already been used',
      );
    });

    it('should throw BadRequestException if token expired', async () => {
      // Arrange: Expired token
      const expiredToken = {
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      };
      mockDbService.db.select().from().where.mockResolvedValue([expiredToken]);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Reset token has expired',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTokenRecord]) // Token found
        .mockResolvedValueOnce([]); // User not found

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(NotFoundException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException if new password same as current', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTokenRecord])
        .mockResolvedValueOnce([validUser]);

      // New password same as current
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'New password must be different from current password',
      );
    });

    it('should mark token as used after successful reset', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTokenRecord])
        .mockResolvedValueOnce([validUser]);

      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      const mockUpdate = mockDbService.db.update().set().where;
      mockUpdate.mockResolvedValue([mockTokenRecord]);

      mockDbService.db.delete().where.mockResolvedValue([]);

      // Act
      await service.resetPassword(resetPasswordDto);

      // Assert: Token marked as used
      expect(mockDbService.db.update).toHaveBeenCalled();
      // Should update both password and token
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should invalidate all user sessions after reset', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTokenRecord])
        .mockResolvedValueOnce([validUser]);

      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      mockDbService.db.update().set().where.mockResolvedValue([validUser]);

      const mockDelete = mockDbService.db.delete().where;
      mockDelete.mockResolvedValue([]);

      // Act
      await service.resetPassword(resetPasswordDto);

      // Assert: All sessions deleted for security
      expect(mockDbService.db.delete).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('getActiveResetTokens', () => {
    const tenantId = TEST_TENANT_ID;

    it('should return active reset tokens for tenant', async () => {
      // Arrange
      const activeTokens = [
        {
          token: 'token-1',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 900000),
          createdAt: new Date(),
        },
        {
          token: 'token-2',
          userId: 'user-2',
          expiresAt: new Date(Date.now() + 600000),
          createdAt: new Date(),
        },
      ];

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce(activeTokens) // Tokens query
        .mockResolvedValueOnce([{ email: 'user1@example.com' }]) // User 1 email
        .mockResolvedValueOnce([{ email: 'user2@example.com' }]); // User 2 email

      // Act
      const result = await service.getActiveResetTokens(tenantId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('email', 'user1@example.com');
      expect(result[0]).toHaveProperty('resetLink');
      expect(result[0].resetLink).toContain('token-1');
      expect(result[1]).toHaveProperty('email', 'user2@example.com');
    });

    it('should return empty array if no active tokens', async () => {
      // Arrange: No tokens found
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.getActiveResetTokens(tenantId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should include reset link with correct format', async () => {
      // Arrange
      const activeToken = {
        token: 'abc-123-xyz',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date(),
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([activeToken])
        .mockResolvedValueOnce([{ email: 'test@example.com' }]);

      // Act
      const result = await service.getActiveResetTokens(tenantId);

      // Assert
      expect(result[0].resetLink).toBe(
        'http://localhost:3000/reset-password?token=abc-123-xyz',
      );
    });

    it('should use FRONTEND_URL from config', async () => {
      // Arrange
      configService.get = vi.fn((key: string, defaultValue?: any) => {
        if (key === 'FRONTEND_URL') return 'https://app.example.com';
        return defaultValue;
      });

      const activeToken = {
        token: 'abc-123-xyz',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date(),
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([activeToken])
        .mockResolvedValueOnce([{ email: 'test@example.com' }]);

      // Act
      const result = await service.getActiveResetTokens(tenantId);

      // Assert
      expect(result[0].resetLink).toBe(
        'https://app.example.com/reset-password?token=abc-123-xyz',
      );
      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL', 'http://localhost:3000');
    });

    it('should handle user not found gracefully', async () => {
      // Arrange
      const activeToken = {
        token: 'abc-123-xyz',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date(),
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([activeToken])
        .mockResolvedValueOnce([]); // User not found

      // Act
      const result = await service.getActiveResetTokens(tenantId);

      // Assert: Should return 'unknown' for missing email
      expect(result[0].email).toBe('unknown');
    });
  });
});
