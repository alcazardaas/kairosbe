import { vi, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * AuthController Unit Tests
 * Tests HTTP request/response handling for authentication endpoints
 * Target Coverage: 100%
 */
describe('AuthController', () => {
  let controller: AuthController;
  let authService: vi.Mocked<AuthService>;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockAuthResponse = {
    token: 'session-token-123',
    refreshToken: 'refresh-token-123',
    expiresAt: new Date(Date.now() + 2592000000),
    user: {
      id: TEST_USER_ID,
      email: 'test@example.com',
      name: 'Test User',
    },
    tenant: {
      id: TEST_TENANT_ID,
    },
  };

  const mockSession = {
    id: 'session-1',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    token: 'session-token-123',
  };

  beforeEach(async () => {
    authService = {
      login: vi.fn(),
      signup: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      validateSession: vi.fn(),
    } as any;

    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user with valid credentials', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto, '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toEqual({
        data: mockAuthResponse,
      });
      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent');
    });

    it('should pass IP address from request', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);
      const ipAddress = '192.168.1.1';

      // Act
      await controller.login(loginDto, ipAddress, 'agent');

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, ipAddress, 'agent');
    });

    it('should pass user agent from headers', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);
      const userAgent = 'Mozilla/5.0';

      // Act
      await controller.login(loginDto, '127.0.0.1', userAgent);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', userAgent);
    });

    it('should handle missing user agent', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      await controller.login(loginDto, '127.0.0.1', undefined);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', undefined);
    });

    it('should return response with data wrapper', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto, '127.0.0.1');

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockAuthResponse);
    });

    it('should include all auth response fields', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto, '127.0.0.1');

      // Assert
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data).toHaveProperty('expiresAt');
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('tenant');
    });

    it('should include tenantId in login when specified', async () => {
      // Arrange
      const loginDtoWithTenant = {
        ...loginDto,
        tenantId: 'specific-tenant-id',
      };

      authService.login.mockResolvedValue({
        ...mockAuthResponse,
        tenant: { id: 'specific-tenant-id' },
      });

      // Act
      const result = await controller.login(loginDtoWithTenant, '127.0.0.1');

      // Assert
      expect(result.data.tenant.id).toBe('specific-tenant-id');
      expect(authService.login).toHaveBeenCalledWith(loginDtoWithTenant, '127.0.0.1', undefined);
    });
  });

  describe('POST /auth/refresh', () => {
    const refreshDto = {
      refreshToken: 'refresh-token-123',
    };

    it('should refresh session with valid refresh token', async () => {
      // Arrange
      authService.refresh.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.refresh(refreshDto);

      // Assert
      expect(result).toEqual({
        data: mockAuthResponse,
      });
      expect(authService.refresh).toHaveBeenCalledWith('refresh-token-123');
    });

    it('should return new tokens', async () => {
      // Arrange
      const newResponse = {
        ...mockAuthResponse,
        token: 'new-token-456',
        refreshToken: 'new-refresh-456',
      };

      authService.refresh.mockResolvedValue(newResponse);

      // Act
      const result = await controller.refresh(refreshDto);

      // Assert
      expect(result.data.token).toBe('new-token-456');
      expect(result.data.refreshToken).toBe('new-refresh-456');
    });

    it('should return user and tenant information', async () => {
      // Arrange
      authService.refresh.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.refresh(refreshDto);

      // Assert
      expect(result.data.user).toEqual(mockAuthResponse.user);
      expect(result.data.tenant).toEqual(mockAuthResponse.tenant);
    });

    it('should include new expiry time', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 3600000);
      const responseWithExpiry = {
        ...mockAuthResponse,
        expiresAt: futureDate,
      };

      authService.refresh.mockResolvedValue(responseWithExpiry);

      // Act
      const result = await controller.refresh(refreshDto);

      // Assert
      expect(result.data.expiresAt).toEqual(futureDate);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and invalidate session', async () => {
      // Arrange
      authService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(mockSession);

      // Assert
      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith('session-token-123');
    });

    it('should extract token from session', async () => {
      // Arrange
      const customSession = {
        ...mockSession,
        token: 'custom-token-xyz',
      };

      authService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(customSession);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith('custom-token-xyz');
    });

    it('should not return any data', async () => {
      // Arrange
      authService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(mockSession);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/me', () => {
    const mockUser = {
      id: TEST_USER_ID,
      email: 'test@example.com',
      name: 'Test User',
      locale: 'en-US',
    };

    const mockMembership = {
      id: 'membership-1',
      role: 'employee',
      status: 'active',
    };

    const mockPolicy = {
      id: 'policy-1',
      tenantId: TEST_TENANT_ID,
      minHoursPerWeek: 40,
      maxHoursPerDay: 24,
      requiresApproval: true,
    };

    it('should return current user context', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser]) // User query
        .mockResolvedValueOnce([mockMembership]) // Membership query
        .mockResolvedValueOnce([mockPolicy]); // Policy query

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('tenant');
      expect(result.data).toHaveProperty('membership');
      expect(result.data).toHaveProperty('timesheetPolicy');
    });

    it('should return user details', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.user).toEqual({
        id: TEST_USER_ID,
        email: 'test@example.com',
        name: 'Test User',
        locale: 'en-US',
      });
    });

    it('should return tenant information', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.tenant).toEqual({
        id: TEST_TENANT_ID,
      });
    });

    it('should return membership details', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.membership).toEqual({
        role: 'employee',
        status: 'active',
      });
    });

    it('should return timesheet policy', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.timesheetPolicy).toEqual(mockPolicy);
    });

    it('should return null for policy when not found', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([]); // No policy

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.timesheetPolicy).toBeNull();
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]); // No user

      // Act & Assert
      await expect(controller.getCurrentUser(mockSession, TEST_TENANT_ID)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw error when membership not found', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser]) // User found
        .mockResolvedValueOnce([]); // No membership

      // Act & Assert
      await expect(controller.getCurrentUser(mockSession, TEST_TENANT_ID)).rejects.toThrow(
        'Membership not found',
      );
    });

    it('should query user by session userId', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      const customSession = {
        ...mockSession,
        userId: 'custom-user-id',
      };

      // Act
      await controller.getCurrentUser(customSession, TEST_TENANT_ID);

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should query membership by userId and tenantId', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert: Verify membership query was called
      expect(mockDbService.db.select).toHaveBeenCalledTimes(3);
    });

    it('should limit user query to 1 result', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockReturnThis();

      mockDbService.db.limit = vi
        .fn()
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(mockDbService.db.limit).toHaveBeenCalledWith(1);
    });

    it('should handle different user roles', async () => {
      // Arrange: Manager role
      const managerMembership = { ...mockMembership, role: 'manager' };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([managerMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.membership.role).toBe('manager');
    });

    it('should handle admin role', async () => {
      // Arrange
      const adminMembership = { ...mockMembership, role: 'admin' };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([adminMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.membership.role).toBe('admin');
    });

    it('should handle user without locale', async () => {
      // Arrange
      const userWithoutLocale = { ...mockUser, locale: null };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([userWithoutLocale])
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([mockPolicy]);

      // Act
      const result = await controller.getCurrentUser(mockSession, TEST_TENANT_ID);

      // Assert
      expect(result.data.user.locale).toBeNull();
    });
  });

  describe('POST /auth/signup', () => {
    const signupDto = {
      email: 'newuser@newcompany.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'New Company Inc',
      timezone: 'America/New_York',
      acceptedTerms: true,
    };

    const mockSignupResponse = {
      token: 'new-session-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(Date.now() + 2592000000),
      user: {
        id: 'new-user-id',
        email: 'newuser@newcompany.com',
        name: 'John Doe',
      },
      tenant: {
        id: 'new-tenant-id',
        name: 'New Company Inc',
        slug: 'new-company-inc',
      },
      membership: {
        role: 'admin',
        status: 'active',
      },
    };

    it('should create new account and organization', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      const result = await controller.signup(signupDto, '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toEqual({
        data: mockSignupResponse,
      });
      expect(authService.signup).toHaveBeenCalledWith(signupDto, '127.0.0.1', 'test-agent');
    });

    it('should pass IP address from request', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);
      const ipAddress = '192.168.1.1';

      // Act
      await controller.signup(signupDto, ipAddress, 'agent');

      // Assert
      expect(authService.signup).toHaveBeenCalledWith(signupDto, ipAddress, 'agent');
    });

    it('should pass user agent from headers', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);
      const userAgent = 'Mozilla/5.0';

      // Act
      await controller.signup(signupDto, '127.0.0.1', userAgent);

      // Assert
      expect(authService.signup).toHaveBeenCalledWith(signupDto, '127.0.0.1', userAgent);
    });

    it('should handle missing user agent', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      await controller.signup(signupDto, '127.0.0.1', undefined);

      // Assert
      expect(authService.signup).toHaveBeenCalledWith(signupDto, '127.0.0.1', undefined);
    });

    it('should return response with data wrapper', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      const result = await controller.signup(signupDto, '127.0.0.1');

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockSignupResponse);
    });

    it('should include all signup response fields', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      const result = await controller.signup(signupDto, '127.0.0.1');

      // Assert
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data).toHaveProperty('expiresAt');
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('tenant');
      expect(result.data).toHaveProperty('membership');
    });

    it('should include tenant information with slug', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      const result = await controller.signup(signupDto, '127.0.0.1');

      // Assert
      expect(result.data.tenant.name).toBe('New Company Inc');
      expect(result.data.tenant.slug).toBe('new-company-inc');
    });

    it('should include admin membership', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      const result = await controller.signup(signupDto, '127.0.0.1');

      // Assert
      expect(result.data.membership.role).toBe('admin');
      expect(result.data.membership.status).toBe('active');
    });

    it('should include session tokens for auto-login', async () => {
      // Arrange
      authService.signup.mockResolvedValue(mockSignupResponse);

      // Act
      const result = await controller.signup(signupDto, '127.0.0.1');

      // Assert
      expect(result.data.token).toBe('new-session-token');
      expect(result.data.refreshToken).toBe('new-refresh-token');
      expect(result.data.expiresAt).toEqual(mockSignupResponse.expiresAt);
    });
  });
});
