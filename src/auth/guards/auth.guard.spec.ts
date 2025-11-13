import { vi, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../../test/constants';

/**
 * AuthGuard Unit Tests
 * Tests authentication guard for protected routes
 * Target Coverage: 100%
 */
describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: vi.Mocked<AuthService>;
  let reflector: vi.Mocked<Reflector>;

  const mockSessionData = {
    id: 'session-1',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    token: 'valid-token-123',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 86400000),
    refreshExpiresAt: new Date(Date.now() + 7776000000),
  };

  beforeEach(async () => {
    authService = {
      validateSession: vi.fn(),
    } as any;

    reflector = {
      getAllAndOverride: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  /**
   * Helper function to create mock ExecutionContext
   */
  const createMockContext = (authHeader?: string): ExecutionContext => {
    const mockRequest = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any;
  };

  describe('canActivate - public routes', () => {
    it('should allow access to public routes without authentication', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(true); // Route is public
      const context = createMockContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.validateSession).not.toHaveBeenCalled();
    });

    it('should check isPublic metadata on handler and class', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      // Act
      await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('canActivate - protected routes', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false); // Route is not public
    });

    it('should allow access with valid Bearer token', async () => {
      // Arrange
      const context = createMockContext('Bearer valid-token-123');
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.validateSession).toHaveBeenCalledWith('valid-token-123');
    });

    it('should attach session data to request', async () => {
      // Arrange
      const mockRequest = {
        headers: { authorization: 'Bearer valid-token-123' },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      reflector.getAllAndOverride.mockReturnValue(false);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockRequest).toHaveProperty('session');
      expect((mockRequest as any).session).toEqual({
        id: mockSessionData.id,
        userId: mockSessionData.userId,
        tenantId: mockSessionData.tenantId,
        token: mockSessionData.token,
      });
    });

    it('should attach tenantId to request', async () => {
      // Arrange
      const mockRequest = {
        headers: { authorization: 'Bearer valid-token-123' },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      reflector.getAllAndOverride.mockReturnValue(false);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockRequest).toHaveProperty('tenantId');
      expect((mockRequest as any).tenantId).toBe(TEST_TENANT_ID);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      // Arrange
      const context = createMockContext(); // No authorization header

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No authentication token provided',
      );
    });

    it('should throw UnauthorizedException when authorization header is empty', async () => {
      // Arrange
      const context = createMockContext('');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No authentication token provided',
      );
    });

    it('should throw UnauthorizedException when token type is not Bearer', async () => {
      // Arrange
      const context = createMockContext('Basic dXNlcjpwYXNz'); // Basic auth

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No authentication token provided',
      );
    });

    it('should throw UnauthorizedException when session is invalid', async () => {
      // Arrange
      const context = createMockContext('Bearer invalid-token');
      authService.validateSession.mockResolvedValue(null); // Invalid session

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    });

    it('should throw UnauthorizedException when session is expired', async () => {
      // Arrange
      const context = createMockContext('Bearer expired-token');
      authService.validateSession.mockResolvedValue(null); // Returns null for expired

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    });

    it('should throw UnauthorizedException when validateSession throws error', async () => {
      // Arrange
      const context = createMockContext('Bearer error-token');
      authService.validateSession.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication failed');
    });

    it('should extract token correctly from Bearer auth header', async () => {
      // Arrange
      const token = 'my-session-token-xyz';
      const context = createMockContext(`Bearer ${token}`);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.validateSession).toHaveBeenCalledWith(token);
    });

    it('should handle token with extra spaces in header', async () => {
      // Arrange
      const context = createMockContext('  Bearer   token-with-spaces  ');
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act & Assert: Should handle gracefully
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should not attach session data when validation fails', async () => {
      // Arrange
      const mockRequest = {
        headers: { authorization: 'Bearer invalid-token' },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      reflector.getAllAndOverride.mockReturnValue(false);
      authService.validateSession.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow();
      expect(mockRequest).not.toHaveProperty('session');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should return undefined for missing authorization header', async () => {
      // Arrange
      const context = createMockContext();
      reflector.getAllAndOverride.mockReturnValue(false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No authentication token provided',
      );
    });

    it('should return undefined for malformed authorization header', async () => {
      // Arrange
      const context = createMockContext('InvalidFormat');
      reflector.getAllAndOverride.mockReturnValue(false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No authentication token provided',
      );
    });

    it('should return token for valid Bearer format', async () => {
      // Arrange
      const context = createMockContext('Bearer valid-token');
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.validateSession).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should handle multiple Bearer words in header', async () => {
      // Arrange
      const context = createMockContext('Bearer Bearer token');
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      await guard.canActivate(context);

      // Assert: Should take second part (after first space)
      expect(authService.validateSession).toHaveBeenCalledWith('Bearer');
    });

    it('should handle very long tokens', async () => {
      // Arrange
      const longToken = 'a'.repeat(500);
      const context = createMockContext(`Bearer ${longToken}`);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.validateSession).toHaveBeenCalledWith(longToken);
    });

    it('should handle tokens with special characters', async () => {
      // Arrange
      const specialToken = 'token-with-dashes_and_underscores.and.dots';
      const context = createMockContext(`Bearer ${specialToken}`);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.validateSession).toHaveBeenCalledWith(specialToken);
    });

    it('should attach correct session fields to request', async () => {
      // Arrange
      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      reflector.getAllAndOverride.mockReturnValue(false);
      authService.validateSession.mockResolvedValue(mockSessionData);

      // Act
      await guard.canActivate(context);

      // Assert: Verify only specific fields are attached
      expect((mockRequest as any).session).toEqual({
        id: mockSessionData.id,
        userId: mockSessionData.userId,
        tenantId: mockSessionData.tenantId,
        token: mockSessionData.token,
      });

      // Should not include refresh tokens or expiry in request
      expect((mockRequest as any).session).not.toHaveProperty('refreshToken');
      expect((mockRequest as any).session).not.toHaveProperty('expiresAt');
    });
  });
});
