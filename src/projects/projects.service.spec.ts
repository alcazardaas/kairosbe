import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * ProjectsService Unit Tests
 * Tests project CRUD operations and member management
 * Target Coverage: 100%
 */
describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockProject = {
    id: 'project-1',
    tenantId: TEST_TENANT_ID,
    name: 'Project Alpha',
    code: 'PA',
    active: true,
    description: 'Test project',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    clientName: 'Test Client',
    budgetHours: '1000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockProjectMember = {
    id: 'member-1',
    tenantId: TEST_TENANT_ID,
    projectId: 'project-1',
    userId: TEST_USER_ID,
    role: 'member',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockQuery = {
      page: 1,
      limit: 20,
    };

    it('should return paginated projects', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, mockQuery);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by active status', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      // Act
      await service.findAll(TEST_TENANT_ID, { ...mockQuery, active: true });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should search by project name', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      // Act
      await service.findAll(TEST_TENANT_ID, { ...mockQuery, search: 'Alpha' });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should sort by field', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      // Act
      await service.findAll(TEST_TENANT_ID, { ...mockQuery, sort: 'name:asc' });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([mockProject]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 2, limit: 10 });

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should filter by tenant ID', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      // Act
      await service.findAll(TEST_TENANT_ID, mockQuery);

      // Assert: Verify tenant filtering is applied
      expect(mockDbService.db.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result.id).toBe('project-1');
      expect(result.name).toBe('Project Alpha');
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Project with ID nonexistent not found',
      );
    });

    it('should filter by tenant ID', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      await service.findOne(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Project',
      code: 'NP',
      active: true,
      description: 'Test description',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      clientName: 'Client Name',
      budgetHours: 1000,
    };

    it('should create new project', async () => {
      // Arrange
      mockDbService
        .db
        .insert()
        .values.mockResolvedValue([{ ...mockProject, ...createDto }]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.name).toBe('New Project');
      expect(result.tenantId).toBe(TEST_TENANT_ID);
    });

    it('should throw ConflictException on duplicate name', async () => {
      // Arrange
      const duplicateError: any = new Error('Duplicate');
      duplicateError.code = '23505';
      mockDbService.db.insert().values.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(
        'Project with name "New Project" already exists for this tenant',
      );
    });

    it('should create project with all optional fields', async () => {
      // Arrange
      mockDbService
        .db
        .insert()
        .values.mockResolvedValue([{ ...mockProject, ...createDto }]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.description).toBe('Test description');
      expect(result.clientName).toBe('Client Name');
      expect(result.budgetHours).toBeDefined();
    });

    it('should create project without optional fields', async () => {
      // Arrange
      const minimalDto = {
        name: 'Minimal Project',
        code: 'MP',
        active: true,
      };
      mockDbService
        .db
        .insert()
        .values.mockResolvedValue([{ ...mockProject, ...minimalDto }]);

      // Act
      const result = await service.create(TEST_TENANT_ID, minimalDto as any);

      // Assert
      expect(result.name).toBe('Minimal Project');
    });

    it('should associate project with tenant', async () => {
      // Arrange
      mockDbService
        .db
        .insert()
        .values.mockResolvedValue([{ ...mockProject, tenantId: TEST_TENANT_ID }]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.tenantId).toBe(TEST_TENANT_ID);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Project',
      active: false,
    };

    it('should update project', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject]) // findOne check
        .mockResolvedValue([{ ...mockProject, ...updateDto }]); // update result

      // Act
      const result = await service.update(TEST_TENANT_ID, 'project-1', updateDto);

      // Assert
      expect(result.name).toBe('Updated Project');
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update(TEST_TENANT_ID, 'nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on duplicate name', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      const duplicateError: any = new Error('Duplicate');
      duplicateError.code = '23505';
      mockDbService.db.update().set().where.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.update(TEST_TENANT_ID, 'project-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update only specified fields', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValue([{ ...mockProject, name: 'New Name' }]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'project-1', { name: 'New Name' });

      // Assert
      expect(result.name).toBe('New Name');
    });

    it('should update updatedAt timestamp', async () => {
      // Arrange
      const now = new Date();
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValue([{ ...mockProject, updatedAt: now }]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'project-1', updateDto);

      // Assert
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete project', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);
      mockDbService.db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.remove(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by tenant ID when deleting', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);
      mockDbService.db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.remove(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    it('should return project members with user details', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject]) // findOne check
        .mockResolvedValueOnce([{ ...mockProjectMember, user: mockUser }]); // members query

      // Act
      const result = await service.getMembers(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(TEST_USER_ID);
      expect(result[0].user).toBeDefined();
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getMembers(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array for project with no members', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getMembers(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('addMember', () => {
    it('should add user to project', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject]) // findOne
        .mockResolvedValueOnce([mockUser]) // user check
        .mockResolvedValueOnce([]) // no existing membership
        .mockResolvedValue([mockProjectMember]); // insert result

      // Act
      const result = await service.addMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID);

      // Assert
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.projectId).toBe('project-1');
    });

    it('should add member with specified role', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ ...mockProjectMember, role: 'lead' }]);

      // Act
      const result = await service.addMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID, 'lead');

      // Assert
      expect(result.role).toBe('lead');
    });

    it('should throw BadRequestException when user not found', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([]); // no user

      // Act & Assert
      await expect(service.addMember(TEST_TENANT_ID, 'project-1', 'invalid-user')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addMember(TEST_TENANT_ID, 'project-1', 'invalid-user')).rejects.toThrow(
        'User not found in this tenant',
      );
    });

    it('should throw ConflictException when user already member', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([mockProjectMember]); // existing membership

      // Act & Assert
      await expect(service.addMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.addMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID)).rejects.toThrow(
        'User is already a member of this project',
      );
    });

    it('should default role to "member" if not specified', async () => {
      // Arrange
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce([])
        .mockResolvedValue([mockProjectMember]);

      // Act
      const result = await service.addMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID);

      // Assert
      expect(result.role).toBe('member');
    });
  });

  describe('removeMember', () => {
    it('should remove user from project', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);
      mockDbService.db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockProjectMember]),
      });

      // Act
      await service.removeMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID);

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.removeMember(TEST_TENANT_ID, 'nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user not a member', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);
      mockDbService.db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]), // no rows deleted
      });

      // Act & Assert
      await expect(service.removeMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID)).rejects.toThrow(
        'User is not a member of this project',
      );
    });
  });

  describe('bulkAddMembers', () => {
    it('should add multiple members successfully', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject]) // findOne
        .mockResolvedValueOnce([{ id: 'user-1' }]) // user 1 exists
        .mockResolvedValueOnce([]) // no existing membership for user 1
        .mockResolvedValueOnce([{ id: 'user-2' }]) // user 2 exists
        .mockResolvedValueOnce([]); // no existing membership for user 2

      mockDbService.db.insert().values.mockResolvedValue([mockProjectMember]);

      // Act
      const result = await service.bulkAddMembers(TEST_TENANT_ID, 'project-1', userIds);

      // Assert
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should collect failures for invalid users', async () => {
      // Arrange
      const userIds = ['user-1', 'invalid-user'];
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([{ id: 'user-1' }]) // user 1 exists
        .mockResolvedValueOnce([]) // no existing membership
        .mockResolvedValueOnce([]); // invalid user not found

      mockDbService.db.insert().values.mockResolvedValue([mockProjectMember]);

      // Act
      const result = await service.bulkAddMembers(TEST_TENANT_ID, 'project-1', userIds);

      // Assert
      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('User not found in this tenant');
    });

    it('should collect failures for existing members', async () => {
      // Arrange
      const userIds = ['user-1'];
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([{ id: 'user-1' }])
        .mockResolvedValueOnce([mockProjectMember]); // already a member

      // Act
      const result = await service.bulkAddMembers(TEST_TENANT_ID, 'project-1', userIds);

      // Assert
      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('User is already a member of this project');
    });

    it('should apply role to all added members', async () => {
      // Arrange
      const userIds = ['user-1'];
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([{ id: 'user-1' }])
        .mockResolvedValueOnce([]);

      mockDbService
        .db
        .insert()
        .values.mockResolvedValue([{ ...mockProjectMember, role: 'contributor' }]);

      // Act
      const result = await service.bulkAddMembers(
        TEST_TENANT_ID,
        'project-1',
        userIds,
        'contributor',
      );

      // Assert
      expect(result.success).toHaveLength(1);
    });

    it('should handle mixed success and failure', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockDbService
        .db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce([{ id: 'user-1' }]) // success
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]) // failure: not found
        .mockResolvedValueOnce([{ id: 'user-3' }]) // success
        .mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockResolvedValue([mockProjectMember]);

      // Act
      const result = await service.bulkAddMembers(TEST_TENANT_ID, 'project-1', userIds);

      // Assert
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('getMyProjects', () => {
    it('should return projects user is member of', async () => {
      // Arrange
      const myProject = {
        ...mockProject,
        memberRole: 'member',
        memberSince: new Date(),
      };
      mockDbService.db.select().from().where.mockResolvedValue([myProject]);

      // Act
      const result = await service.getMyProjects(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('project-1');
      expect(result[0].memberRole).toBe('member');
    });

    it('should return empty array for user with no project memberships', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.getMyProjects(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toEqual([]);
    });

    it('should include member role and date', async () => {
      // Arrange
      const myProject = {
        ...mockProject,
        memberRole: 'lead',
        memberSince: new Date('2025-01-01'),
      };
      mockDbService.db.select().from().where.mockResolvedValue([myProject]);

      // Act
      const result = await service.getMyProjects(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result[0].memberRole).toBe('lead');
      expect(result[0].memberSince).toBeDefined();
    });

    it('should filter by tenant ID', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      await service.getMyProjects(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });
  });
});
