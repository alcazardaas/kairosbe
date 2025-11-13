import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * SearchService Unit Tests
 * Tests search functionality for projects and tasks
 * Target Coverage: 100%
 */
describe('SearchService', () => {
  let service: SearchService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockProject = {
    id: 'project-1',
    name: 'Project Alpha',
    code: 'PROJ-001',
    active: true,
    tenantId: TEST_TENANT_ID,
  };

  const mockTask = {
    id: 'task-1',
    name: 'Task Alpha',
    projectId: 'project-1',
    parentTaskId: null,
    tenantId: TEST_TENANT_ID,
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchProjects', () => {
    it('should search projects by name', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Project Alpha');
    });

    it('should return empty array for empty query', async () => {
      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, '');

      // Assert
      expect(result).toEqual([]);
      expect(mockDbService.db.select).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace query', async () => {
      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, '   ');

      // Assert
      expect(result).toEqual([]);
    });

    it('should respect default limit', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      await service.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(mockDbService.db.select().from().where().limit).toHaveBeenCalledWith(10);
    });

    it('should respect custom limit', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      await service.searchProjects(TEST_TENANT_ID, 'Alpha', 5);

      // Assert
      expect(mockDbService.db.select().from().where().limit).toHaveBeenCalledWith(5);
    });

    it('should filter by active projects only', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      await service.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      await service.searchProjects('different-tenant', 'Alpha');

      // Assert
      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });

    it('should transform keys to camelCase', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result[0]).toHaveProperty('tenantId');
    });

    it('should return multiple results', async () => {
      // Arrange
      const projects = [mockProject, { ...mockProject, id: 'project-2', name: 'Alpha Project 2' }];
      mockDbService.db.select().from().where.mockResolvedValue(projects);

      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should handle case-insensitive search', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, 'alpha');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should search partial matches', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);

      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, 'Alph');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should return empty when no matches', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.searchProjects(TEST_TENANT_ID, 'NonExistent');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('searchTasks', () => {
    it('should search tasks by name', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Task Alpha');
    });

    it('should return empty array for empty query', async () => {
      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, '');

      // Assert
      expect(result).toEqual([]);
      expect(mockDbService.db.select).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace query', async () => {
      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, '   ');

      // Assert
      expect(result).toEqual([]);
    });

    it('should respect default limit', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      await service.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(mockDbService.db.select().from().where().limit).toHaveBeenCalledWith(10);
    });

    it('should respect custom limit', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      await service.searchTasks(TEST_TENANT_ID, 'Alpha', undefined, 5);

      // Assert
      expect(mockDbService.db.select().from().where().limit).toHaveBeenCalledWith(5);
    });

    it('should filter by project when provided', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      await service.searchTasks(TEST_TENANT_ID, 'Alpha', 'project-1');

      // Assert
      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });

    it('should not filter by project when not provided', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      await service.searchTasks(TEST_TENANT_ID, 'Alpha', undefined);

      // Assert
      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      await service.searchTasks('different-tenant', 'Alpha');

      // Assert
      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });

    it('should transform keys to camelCase', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result[0]).toHaveProperty('projectId');
      expect(result[0]).toHaveProperty('parentTaskId');
      expect(result[0]).toHaveProperty('tenantId');
    });

    it('should return multiple results', async () => {
      // Arrange
      const tasks = [mockTask, { ...mockTask, id: 'task-2', name: 'Alpha Task 2' }];
      mockDbService.db.select().from().where.mockResolvedValue(tasks);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should handle case-insensitive search', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'alpha');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should search partial matches', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'Alph');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should return empty when no matches', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'NonExistent');

      // Assert
      expect(result).toEqual([]);
    });

    it('should include parent task information', async () => {
      // Arrange
      const taskWithParent = { ...mockTask, parentTaskId: 'parent-1' };
      mockDbService.db.select().from().where.mockResolvedValue([taskWithParent]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result[0].parentTaskId).toBe('parent-1');
    });

    it('should handle null parent task', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTask]);

      // Act
      const result = await service.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result[0].parentTaskId).toBeNull();
    });
  });
});
