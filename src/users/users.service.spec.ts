import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * UsersService Unit Tests
 * Tests user management with complex workflows:
 * - Multi-table joins (users, memberships, profiles)
 * - Circular manager reference validation
 * - Permission checks (self-modification protection)
 * - Invitation workflow
 * Target Coverage: 100%
 */
describe('UsersService', () => {
  let service: UsersService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockUser = {
    id: TEST_USER_ID,
    email: 'user@example.com',
    name: 'Test User',
    locale: 'en',
    created_at: new Date(),
    last_login_at: null,
  };

  const mockMembership = {
    tenant_id: TEST_TENANT_ID,
    user_id: TEST_USER_ID,
    role: 'employee',
    status: 'active',
    created_at: new Date(),
  };

  const mockProfile = {
    tenant_id: TEST_TENANT_ID,
    user_id: TEST_USER_ID,
    job_title: 'Developer',
    start_date: new Date('2025-01-01'),
    manager_user_id: 'manager-1',
    location: 'NYC',
    phone: '+15555555555',
  };

  const mockUserWithJoins = {
    id: TEST_USER_ID,
    email: 'user@example.com',
    name: 'Test User',
    locale: 'en',
    createdAt: new Date(),
    lastLoginAt: null,
    membership: {
      role: 'employee',
      status: 'active',
      createdAt: new Date(),
    },
    profile: {
      jobTitle: 'Developer',
      startDate: new Date('2025-01-01'),
      managerUserId: 'manager-1',
      location: 'NYC',
      phone: '+15555555555',
    },
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockUserWithJoins]); // data query

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by search query (name)', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, q: 'Test' });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by search query (email)', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, q: 'user@example.com' });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by role', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, role: 'employee' });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, status: 'active' });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by manager (direct reports)', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, managerId: 'manager-1' });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should sort by name', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, sort: 'name:asc' });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([mockUserWithJoins]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 2, limit: 20 });

      // Assert
      expect(result.page).toBe(2);
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAll('different-tenant', { page: 1, limit: 20 });

      // Assert
      expect(result.data).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockUserWithJoins]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result.data.id).toBe(TEST_USER_ID);
      expect(result.data.email).toBe('user@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        'User not found in this tenant',
      );
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('different-tenant', TEST_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include profile data', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockUserWithJoins]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result.data.profile).toBeDefined();
      expect(result.data.profile.jobTitle).toBe('Developer');
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'new@example.com',
      name: 'New User',
      role: 'employee' as const,
      sendInvite: false,
    };

    it('should create new user', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // no existing user
      mockDbService
        .getDb()
        .insert()
        .values.mockResolvedValueOnce([{ id: 'user-2', ...mockUser }]); // insert user
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockMembership]); // insert membership
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto, TEST_USER_ID);

      // Assert
      expect(result.data.email).toBe('user@example.com');
    });

    it('should invite existing user to tenant', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser]) // existing user
        .mockResolvedValueOnce([]); // no existing membership
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockMembership]); // insert membership
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto, TEST_USER_ID);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if user already member', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockUser]) // existing user
        .mockResolvedValueOnce([mockMembership]); // existing membership

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, createDto, TEST_USER_ID)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(TEST_TENANT_ID, createDto, TEST_USER_ID)).rejects.toThrow(
        'User is already a member of this tenant',
      );
    });

    it('should create user with profile', async () => {
      // Arrange
      const dtoWithProfile = {
        ...createDto,
        profile: {
          jobTitle: 'Developer',
          managerUserId: 'manager-1',
        },
      };
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // no existing user
      mockDbService
        .getDb()
        .insert()
        .values.mockResolvedValueOnce([{ id: 'user-2', ...mockUser }]); // insert user
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockMembership]); // insert membership
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // validateManager: manager exists
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // validateManager: no circular ref
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockProfile]); // insert profile
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      // Act
      const result = await service.create(TEST_TENANT_ID, dtoWithProfile, TEST_USER_ID);

      // Assert
      expect(result).toBeDefined();
    });

    it('should validate manager exists', async () => {
      // Arrange
      const dtoWithProfile = {
        ...createDto,
        profile: { managerUserId: 'nonexistent' },
      };
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // no existing user
      mockDbService
        .getDb()
        .insert()
        .values.mockResolvedValueOnce([{ id: 'user-2', ...mockUser }]); // insert user
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockMembership]); // insert membership
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // validateManager: manager not found

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, dtoWithProfile, TEST_USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create invitation when sendInvite is true', async () => {
      // Arrange
      const dtoWithInvite = { ...createDto, sendInvite: true };
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // no existing user
      mockDbService
        .getDb()
        .insert()
        .values.mockResolvedValueOnce([{ id: 'user-2', ...mockUser }]); // insert user
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockMembership]); // insert membership
      mockDbService
        .getDb()
        .insert()
        .values.mockResolvedValueOnce([{ token: 'abc123' }]); // insert invitation
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await service.create(TEST_TENANT_ID, dtoWithInvite, TEST_USER_ID);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Name',
      role: 'manager' as const,
    };

    it('should update user', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // verify exists
      mockDbService.getDb().update().set.mockResolvedValueOnce([]); // update user
      mockDbService.getDb().update().set.mockResolvedValueOnce([]); // update membership
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      // Act
      const result = await service.update(TEST_TENANT_ID, TEST_USER_ID, updateDto, 'admin-1');

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.update(TEST_TENANT_ID, 'nonexistent', updateDto, TEST_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on self role change', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockMembership]);

      // Act & Assert
      await expect(
        service.update(TEST_TENANT_ID, TEST_USER_ID, updateDto, TEST_USER_ID),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(TEST_TENANT_ID, TEST_USER_ID, updateDto, TEST_USER_ID),
      ).rejects.toThrow('Cannot change your own role');
    });

    it('should update user profile', async () => {
      // Arrange
      const updateWithProfile = { profile: { jobTitle: 'Senior Developer' } };
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // verify exists
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockProfile]); // profile exists
      mockDbService.getDb().update().set.mockResolvedValueOnce([]); // update profile
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      // Act
      const result = await service.update(
        TEST_TENANT_ID,
        TEST_USER_ID,
        updateWithProfile,
        'admin-1',
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should create profile if not exists', async () => {
      // Arrange
      const updateWithProfile = { profile: { jobTitle: 'Developer' } };
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // verify exists
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // profile not exists
      mockDbService.getDb().insert().values.mockResolvedValueOnce([mockProfile]); // create profile
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockUserWithJoins]); // findOne

      // Act
      const result = await service.update(
        TEST_TENANT_ID,
        TEST_USER_ID,
        updateWithProfile,
        'admin-1',
      );

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should deactivate user', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockMembership]) // verify exists
        .mockResolvedValueOnce([{ role: 'admin' }]); // current user role
      mockDbService.getDb().update().set.mockResolvedValue([]);

      // Act
      await service.delete(TEST_TENANT_ID, 'user-2', TEST_USER_ID);

      // Assert
      expect(mockDbService.getDb().update().set).toHaveBeenCalled();
    });

    it('should throw ForbiddenException on self-deactivation', async () => {
      // Act & Assert
      await expect(service.delete(TEST_TENANT_ID, TEST_USER_ID, TEST_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.delete(TEST_TENANT_ID, TEST_USER_ID, TEST_USER_ID)).rejects.toThrow(
        'Cannot deactivate your own account',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.delete(TEST_TENANT_ID, 'nonexistent', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow manager to deactivate direct report', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockMembership]) // verify exists
        .mockResolvedValueOnce([{ role: 'manager' }]) // current user is manager
        .mockResolvedValueOnce([mockProfile]); // target is direct report
      mockDbService.getDb().update().set.mockResolvedValue([]);

      // Act
      await service.delete(TEST_TENANT_ID, TEST_USER_ID, 'manager-1');

      // Assert
      expect(mockDbService.getDb().update().set).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if manager tries to deactivate non-direct report', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockMembership]) // verify exists
        .mockResolvedValueOnce([{ role: 'manager' }]) // current user is manager
        .mockResolvedValueOnce([]); // target is NOT direct report

      // Act & Assert
      await expect(service.delete(TEST_TENANT_ID, 'user-2', 'manager-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.delete(TEST_TENANT_ID, 'user-2', 'manager-1')).rejects.toThrow(
        'You can only deactivate your direct reports',
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate disabled user', async () => {
      // Arrange
      const disabledMembership = { ...mockMembership, status: 'disabled' };
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([disabledMembership]) // verify exists and disabled
        .mockResolvedValueOnce([{ role: 'admin' }]); // current user role
      mockDbService.getDb().update().set.mockResolvedValue([]);

      // Act
      await service.reactivate(TEST_TENANT_ID, TEST_USER_ID, 'admin-1');

      // Assert
      expect(mockDbService.getDb().update().set).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.reactivate(TEST_TENANT_ID, 'nonexistent', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user already active', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockMembership]); // status: active

      // Act & Assert
      await expect(service.reactivate(TEST_TENANT_ID, TEST_USER_ID, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reactivate(TEST_TENANT_ID, TEST_USER_ID, 'admin-1')).rejects.toThrow(
        'User is already active',
      );
    });

    it('should allow manager to reactivate direct report', async () => {
      // Arrange
      const disabledMembership = { ...mockMembership, status: 'disabled' };
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([disabledMembership]) // verify exists and disabled
        .mockResolvedValueOnce([{ role: 'manager' }]) // current user is manager
        .mockResolvedValueOnce([mockProfile]); // target is direct report
      mockDbService.getDb().update().set.mockResolvedValue([]);

      // Act
      await service.reactivate(TEST_TENANT_ID, TEST_USER_ID, 'manager-1');

      // Assert
      expect(mockDbService.getDb().update().set).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if manager tries to reactivate non-direct report', async () => {
      // Arrange
      const disabledMembership = { ...mockMembership, status: 'disabled' };
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([disabledMembership]) // verify exists
        .mockResolvedValueOnce([{ role: 'manager' }]) // current user is manager
        .mockResolvedValueOnce([]); // target is NOT direct report

      // Act & Assert
      await expect(service.reactivate(TEST_TENANT_ID, 'user-2', 'manager-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('validateManager', () => {
    it('should validate manager exists', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // manager exists
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([]); // no circular ref

      // Act
      await (service as any).validateManager(TEST_TENANT_ID, 'manager-1', TEST_USER_ID);

      // Assert - no exception thrown
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should throw BadRequestException if manager not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(
        (service as any).validateManager(TEST_TENANT_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(BadRequestException);
      await expect(
        (service as any).validateManager(TEST_TENANT_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow('Manager not found in this tenant');
    });

    it('should detect circular manager reference (direct)', async () => {
      // Arrange: user trying to set manager to themselves
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // manager exists

      // Act & Assert
      await expect(
        (service as any).validateManager(TEST_TENANT_ID, TEST_USER_ID, TEST_USER_ID),
      ).rejects.toThrow(BadRequestException);
      await expect(
        (service as any).validateManager(TEST_TENANT_ID, TEST_USER_ID, TEST_USER_ID),
      ).rejects.toThrow('Circular manager reference detected');
    });

    it('should detect circular manager reference (indirect)', async () => {
      // Arrange: A -> B -> C, trying to set C's manager to A (creates cycle)
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([mockMembership]); // A exists
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ managerUserId: 'B' }]); // A's manager is B
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ managerUserId: 'C' }]); // B's manager is C

      // Act & Assert
      await expect((service as any).validateManager(TEST_TENANT_ID, 'A', 'C')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
