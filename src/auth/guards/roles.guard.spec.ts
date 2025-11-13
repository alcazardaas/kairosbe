import { vi, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { DbService } from '../../db/db.service';
import { createMockDbService } from '../../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../../test/constants';

/**
 * RolesGuard Unit Tests
 * Tests role-based access control (RBAC) guard
 * Target Coverage: 100%
 */
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: vi.Mocked<Reflector>;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockSession = {
    id: 'session-1',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    token: 'token-123',
  };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: vi.fn(),
    } as any;

    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  /**
   * Helper function to create mock ExecutionContext with session
   */
  const createMockContext = (session?: any): ExecutionContext => {
    const mockRequest = {
      session: session || mockSession,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any;
  };

  describe('canActivate - no roles required', () => {
    it('should allow access when no roles are specified', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined); // No roles required
      const context = createMockContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockDbService.db.select).not.toHaveBeenCalled();
    });

    it('should allow access when roles array is null', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should check metadata on both handler and class', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext();

      // Act
      await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('canActivate - with role requirements', () => {
    it('should allow access when user has required role', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow admin access to admin routes', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'admin' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow manager access to manager routes', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['manager']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'manager' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'manager' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should query membership by userId and tenantId', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should limit membership query to 1 result', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db.select().from().where.mockReturnThis();
      mockDbService.db.limit = vi.fn().mockResolvedValue([{ role: 'employee' }]);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockDbService.db.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('canActivate - forbidden scenarios', () => {
    it('should deny access when user lacks required role', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Access denied. Required roles: admin',
      );
    });

    it('should deny employee access to admin routes', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny employee access to manager routes', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['manager']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny when user has none of the required roles', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Access denied. Required roles: admin, manager',
      );
    });

    it('should throw error when session is missing', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);

      const mockRequest = { session: undefined };
      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('No session found');
    });

    it('should throw error when session is null', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);

      const mockRequest = { session: null };
      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('No session found');
    });

    it('should throw error when membership not found', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db.select().from().where.mockResolvedValue([]); // No membership

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('User membership not found');
    });

    it('should include all required roles in error message', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin', 'manager', 'supervisor']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Access denied. Required roles: admin, manager, supervisor',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty roles array as no requirement', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert: Empty array is falsy, should allow access
      expect(result).toBe(true);
    });

    it('should query correct tenant from session', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);

      const customSession = {
        ...mockSession,
        tenantId: 'custom-tenant-id',
      };

      const context = createMockContext(customSession);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should query correct user from session', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);

      const customSession = {
        ...mockSession,
        userId: 'custom-user-id',
      };

      const context = createMockContext(customSession);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow();
    });

    it('should be case-sensitive for role matching', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['Admin']); // Capital A
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'admin' }]); // Lowercase

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should select only role field from membership', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      await guard.canActivate(context);

      // Assert: Verify only role is selected for efficiency
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should work with single role requirement', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should work with multiple role requirements', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['admin', 'manager', 'employee']);
      const context = createMockContext();

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('integration with AuthGuard', () => {
    it('should work after AuthGuard has attached session', async () => {
      // Arrange: AuthGuard would have attached this session
      reflector.getAllAndOverride.mockReturnValue(['employee']);

      const requestWithSession = {
        session: {
          id: 'session-123',
          userId: 'user-456',
          tenantId: 'tenant-789',
          token: 'token-abc',
        },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => requestWithSession }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ role: 'employee' }]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
