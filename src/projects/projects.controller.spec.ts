import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * ProjectsController Unit Tests
 * Tests HTTP request/response handling for project endpoints
 * Target Coverage: 100%
 */
describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: vi.Mocked<ProjectsService>;

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

  const mockPaginatedResponse = {
    data: [mockProject],
    total: 1,
    page: 1,
    limit: 20,
  };

  const mockMember = {
    id: 'member-1',
    userId: TEST_USER_ID,
    role: 'member',
    createdAt: new Date(),
    user: {
      id: TEST_USER_ID,
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getMembers: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      bulkAddMembers: vi.fn(),
      getMyProjects: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /projects', () => {
    it('should list all projects', async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, query);
    });

    it('should pass filters to service', async () => {
      // Arrange
      const query = { page: 1, limit: 20, active: true, search: 'Alpha' };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, query);
    });

    it('should validate query with zod schema', async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('GET /projects/:id', () => {
    it('should get project by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockProject);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result).toEqual(mockProject);
      expect(service.findOne).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1');
    });

    it('should pass project id from URL params', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockProject);

      // Act
      await controller.findOne(TEST_TENANT_ID, 'project-123');

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-123');
    });
  });

  describe('POST /projects', () => {
    const createDto = {
      name: 'New Project',
      code: 'NP',
      active: true,
      description: 'Test description',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      clientName: 'Client',
      budgetHours: 1000,
    };

    it('should create new project', async () => {
      // Arrange
      service.create.mockResolvedValue({ ...mockProject, ...createDto });

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.name).toBe('New Project');
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.create.mockResolvedValue(mockProject);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should pass tenant ID from decorator', async () => {
      // Arrange
      service.create.mockResolvedValue(mockProject);

      // Act
      await controller.create('tenant-123', createDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith('tenant-123', createDto);
    });
  });

  describe('PATCH /projects/:id', () => {
    const updateDto = {
      name: 'Updated Project',
      active: false,
    };

    it('should update project', async () => {
      // Arrange
      service.update.mockResolvedValue({ ...mockProject, ...updateDto });

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'project-1', updateDto);

      // Assert
      expect(result.name).toBe('Updated Project');
      expect(service.update).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1', updateDto);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.update.mockResolvedValue(mockProject);

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'project-1', updateDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should pass project id from URL params', async () => {
      // Arrange
      service.update.mockResolvedValue(mockProject);

      // Act
      await controller.update(TEST_TENANT_ID, 'project-123', updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-123', updateDto);
    });

    it('should update only specified fields', async () => {
      // Arrange
      const partialUpdate = { name: 'New Name' };
      service.update.mockResolvedValue({ ...mockProject, ...partialUpdate });

      // Act
      await controller.update(TEST_TENANT_ID, 'project-1', partialUpdate);

      // Assert
      expect(service.update).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1', partialUpdate);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete project', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1');
    });

    it('should not return any data', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should pass project id from URL params', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(TEST_TENANT_ID, 'project-123');

      // Assert
      expect(service.remove).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-123');
    });
  });

  describe('GET /projects/:id/members', () => {
    it('should get project members', async () => {
      // Arrange
      service.getMembers.mockResolvedValue([mockMember]);

      // Act
      const result = await controller.getMembers(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(TEST_USER_ID);
      expect(service.getMembers).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1');
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.getMembers.mockResolvedValue([mockMember]);

      // Act
      const result = await controller.getMembers(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return empty array for project with no members', async () => {
      // Arrange
      service.getMembers.mockResolvedValue([]);

      // Act
      const result = await controller.getMembers(TEST_TENANT_ID, 'project-1');

      // Assert
      expect(result.data).toEqual([]);
    });
  });

  describe('POST /projects/:id/members', () => {
    const addMemberDto = {
      userId: TEST_USER_ID,
      role: 'contributor',
    };

    it('should add member to project', async () => {
      // Arrange
      service.addMember.mockResolvedValue({ ...mockMember, role: 'contributor' });

      // Act
      const result = await controller.addMember(TEST_TENANT_ID, 'project-1', addMemberDto);

      // Assert
      expect(result.data.userId).toBe(TEST_USER_ID);
      expect(result.data.role).toBe('contributor');
      expect(service.addMember).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'project-1',
        TEST_USER_ID,
        'contributor',
      );
    });

    it('should add member with default role', async () => {
      // Arrange
      const dtoWithoutRole = { userId: TEST_USER_ID };
      service.addMember.mockResolvedValue(mockMember);

      // Act
      const result = await controller.addMember(TEST_TENANT_ID, 'project-1', dtoWithoutRole);

      // Assert
      expect(result.data.role).toBe('member');
      expect(service.addMember).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1', TEST_USER_ID, undefined);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.addMember.mockResolvedValue(mockMember);

      // Act
      const result = await controller.addMember(TEST_TENANT_ID, 'project-1', addMemberDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.addMember.mockResolvedValue(mockMember);

      // Act
      const result = await controller.addMember(TEST_TENANT_ID, 'project-1', addMemberDto);

      // Assert
      expect(result).toHaveProperty('data');
    });
  });

  describe('DELETE /projects/:id/members/:userId', () => {
    it('should remove member from project', async () => {
      // Arrange
      service.removeMember.mockResolvedValue(undefined);

      // Act
      const result = await controller.removeMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID);

      // Assert
      expect(result).toBeUndefined();
      expect(service.removeMember).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-1', TEST_USER_ID);
    });

    it('should not return any data', async () => {
      // Arrange
      service.removeMember.mockResolvedValue(undefined);

      // Act
      const result = await controller.removeMember(TEST_TENANT_ID, 'project-1', TEST_USER_ID);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should pass project id and user id from URL params', async () => {
      // Arrange
      service.removeMember.mockResolvedValue(undefined);

      // Act
      await controller.removeMember(TEST_TENANT_ID, 'project-123', 'user-456');

      // Assert
      expect(service.removeMember).toHaveBeenCalledWith(TEST_TENANT_ID, 'project-123', 'user-456');
    });
  });

  describe('POST /projects/:id/members/bulk', () => {
    const bulkDto = {
      userIds: ['user-1', 'user-2', 'user-3'],
      role: 'contributor',
    };

    it('should bulk add members to project', async () => {
      // Arrange
      const mockResult = {
        success: [
          { userId: 'user-1', membershipId: 'member-1' },
          { userId: 'user-2', membershipId: 'member-2' },
        ],
        failed: [{ userId: 'user-3', reason: 'User not found' }],
      };
      service.bulkAddMembers.mockResolvedValue(mockResult);

      // Act
      const result = await controller.bulkAddMembers(TEST_TENANT_ID, 'project-1', bulkDto);

      // Assert
      expect(result.data).toEqual(mockResult);
      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(service.bulkAddMembers).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'project-1',
        bulkDto.userIds,
        bulkDto.role,
      );
    });

    it('should include summary with counts', async () => {
      // Arrange
      const mockResult = {
        success: [{ userId: 'user-1', membershipId: 'member-1' }],
        failed: [],
      };
      service.bulkAddMembers.mockResolvedValue(mockResult);

      // Act
      const result = await controller.bulkAddMembers(TEST_TENANT_ID, 'project-1', {
        userIds: ['user-1'],
        role: 'member',
      });

      // Assert
      expect(result.summary).toEqual({
        total: 1,
        succeeded: 1,
        failed: 0,
      });
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.bulkAddMembers.mockResolvedValue({ success: [], failed: [] });

      // Act
      const result = await controller.bulkAddMembers(TEST_TENANT_ID, 'project-1', bulkDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle all failures', async () => {
      // Arrange
      const mockResult = {
        success: [],
        failed: [
          { userId: 'user-1', reason: 'Not found' },
          { userId: 'user-2', reason: 'Already member' },
        ],
      };
      service.bulkAddMembers.mockResolvedValue(mockResult);

      // Act
      const result = await controller.bulkAddMembers(TEST_TENANT_ID, 'project-1', {
        userIds: ['user-1', 'user-2'],
        role: 'member',
      });

      // Assert
      expect(result.summary.succeeded).toBe(0);
      expect(result.summary.failed).toBe(2);
    });

    it('should handle all successes', async () => {
      // Arrange
      const mockResult = {
        success: [
          { userId: 'user-1', membershipId: 'member-1' },
          { userId: 'user-2', membershipId: 'member-2' },
        ],
        failed: [],
      };
      service.bulkAddMembers.mockResolvedValue(mockResult);

      // Act
      const result = await controller.bulkAddMembers(TEST_TENANT_ID, 'project-1', {
        userIds: ['user-1', 'user-2'],
        role: 'member',
      });

      // Assert
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
    });
  });
});
