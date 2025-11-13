import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * SearchController Unit Tests
 * Tests HTTP request/response handling for search endpoints
 * Target Coverage: 100%
 */
describe('SearchController', () => {
  let controller: SearchController;
  let service: vi.Mocked<SearchService>;

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
    service = {
      searchProjects: vi.fn(),
      searchTasks: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: service }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /search/projects', () => {
    it('should search projects', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      const result = await controller.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result.data).toEqual([mockProject]);
      expect(result.meta.query).toBe('Alpha');
      expect(result.meta.count).toBe(1);
      expect(service.searchProjects).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', 10);
    });

    it('should use default limit of 10', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      await controller.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(service.searchProjects).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', 10);
    });

    it('should use custom limit when provided', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      await controller.searchProjects(TEST_TENANT_ID, 'Alpha', '5');

      // Assert
      expect(service.searchProjects).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', 5);
    });

    it('should return empty results', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([]);

      // Act
      const result = await controller.searchProjects(TEST_TENANT_ID, 'NonExistent');

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.count).toBe(0);
    });

    it('should return multiple results', async () => {
      // Arrange
      const projects = [mockProject, { ...mockProject, id: 'project-2' }];
      service.searchProjects.mockResolvedValue(projects);

      // Act
      const result = await controller.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.count).toBe(2);
    });

    it('should wrap results in data property', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      const result = await controller.searchProjects(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('should include query in meta', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      const result = await controller.searchProjects(TEST_TENANT_ID, 'Search Term');

      // Assert
      expect(result.meta.query).toBe('Search Term');
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      await controller.searchProjects('tenant-123', 'Alpha');

      // Assert
      expect(service.searchProjects).toHaveBeenCalledWith('tenant-123', 'Alpha', 10);
    });

    it('should parse limit as integer', async () => {
      // Arrange
      service.searchProjects.mockResolvedValue([mockProject]);

      // Act
      await controller.searchProjects(TEST_TENANT_ID, 'Alpha', '25');

      // Assert
      expect(service.searchProjects).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', 25);
    });
  });

  describe('GET /search/tasks', () => {
    it('should search tasks', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result.data).toEqual([mockTask]);
      expect(result.meta.query).toBe('Alpha');
      expect(result.meta.count).toBe(1);
      expect(service.searchTasks).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', undefined, 10);
    });

    it('should use default limit of 10', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      await controller.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(service.searchTasks).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', undefined, 10);
    });

    it('should use custom limit when provided', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      await controller.searchTasks(TEST_TENANT_ID, 'Alpha', undefined, '5');

      // Assert
      expect(service.searchTasks).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', undefined, 5);
    });

    it('should filter by project when provided', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      await controller.searchTasks(TEST_TENANT_ID, 'Alpha', 'project-1');

      // Assert
      expect(service.searchTasks).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', 'project-1', 10);
    });

    it('should not filter by project when not provided', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      await controller.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(service.searchTasks).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', undefined, 10);
    });

    it('should return empty results', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([]);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'NonExistent');

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.count).toBe(0);
    });

    it('should return multiple results', async () => {
      // Arrange
      const tasks = [mockTask, { ...mockTask, id: 'task-2' }];
      service.searchTasks.mockResolvedValue(tasks);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.count).toBe(2);
    });

    it('should wrap results in data property', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('should include query in meta', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'Search Term');

      // Assert
      expect(result.meta.query).toBe('Search Term');
    });

    it('should include projectId in meta when provided', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'Alpha', 'project-1');

      // Assert
      expect(result.meta.projectId).toBe('project-1');
    });

    it('should include undefined projectId in meta when not provided', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      const result = await controller.searchTasks(TEST_TENANT_ID, 'Alpha');

      // Assert
      expect(result.meta.projectId).toBeUndefined();
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      await controller.searchTasks('tenant-123', 'Alpha');

      // Assert
      expect(service.searchTasks).toHaveBeenCalledWith('tenant-123', 'Alpha', undefined, 10);
    });

    it('should parse limit as integer', async () => {
      // Arrange
      service.searchTasks.mockResolvedValue([mockTask]);

      // Act
      await controller.searchTasks(TEST_TENANT_ID, 'Alpha', undefined, '25');

      // Assert
      expect(service.searchTasks).toHaveBeenCalledWith(TEST_TENANT_ID, 'Alpha', undefined, 25);
    });
  });
});
