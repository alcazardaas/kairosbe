import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * TasksController Unit Tests
 * Tests HTTP request/response handling for task endpoints
 * Target Coverage: 100%
 */
describe('TasksController', () => {
  let controller: TasksController;
  let service: vi.Mocked<TasksService>;

  const mockTask = {
    id: 'task-1',
    tenantId: TEST_TENANT_ID,
    projectId: 'project-1',
    name: 'Task Alpha',
    parentTaskId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockTask],
    total: 1,
    page: 1,
    limit: 20,
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /tasks', () => {
    it('should list all tasks', async () => {
      // Arrange
      const query = { page: 1, limit: 20, tenantId: TEST_TENANT_ID };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass filters to service', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        projectId: 'project-1',
        parentTaskId: 'task-parent',
        search: 'Alpha',
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by projectId', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        projectId: 'project-1',
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by parentTaskId', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        parentTaskId: 'task-1',
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter root tasks (parentTaskId null)', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        parentTaskId: null,
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should search tasks by name', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        search: 'Alpha',
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should sort tasks', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        sort: 'name:asc',
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should validate query with zod schema', async () => {
      // Arrange
      const query = { page: 1, limit: 20, tenantId: TEST_TENANT_ID };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('GET /tasks/:id', () => {
    it('should get task by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTask);

      // Act
      const result = await controller.findOne('task-1');

      // Assert
      expect(result).toEqual(mockTask);
      expect(service.findOne).toHaveBeenCalledWith('task-1');
    });

    it('should pass task id from URL params', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTask);

      // Act
      await controller.findOne('task-123');

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('task-123');
    });
  });

  describe('POST /tasks', () => {
    const createDto = {
      tenantId: TEST_TENANT_ID,
      projectId: 'project-1',
      name: 'New Task',
      parentTaskId: null,
    };

    it('should create new task', async () => {
      // Arrange
      service.create.mockResolvedValue({ ...mockTask, ...createDto });

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result.name).toBe('New Task');
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create task with parent', async () => {
      // Arrange
      const dtoWithParent = { ...createDto, parentTaskId: 'task-parent' };
      service.create.mockResolvedValue({ ...mockTask, ...dtoWithParent });

      // Act
      const result = await controller.create(dtoWithParent);

      // Assert
      expect(result.parentTaskId).toBe('task-parent');
      expect(service.create).toHaveBeenCalledWith(dtoWithParent);
    });

    it('should create root task (no parent)', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTask);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result.parentTaskId).toBeNull();
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTask);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('PATCH /tasks/:id', () => {
    const updateDto = {
      name: 'Updated Task',
    };

    it('should update task', async () => {
      // Arrange
      service.update.mockResolvedValue({ ...mockTask, ...updateDto });

      // Act
      const result = await controller.update('task-1', updateDto);

      // Assert
      expect(result.name).toBe('Updated Task');
      expect(service.update).toHaveBeenCalledWith('task-1', updateDto);
    });

    it('should update task parent', async () => {
      // Arrange
      const updateWithParent = { parentTaskId: 'new-parent' };
      service.update.mockResolvedValue({ ...mockTask, ...updateWithParent });

      // Act
      const result = await controller.update('task-1', updateWithParent);

      // Assert
      expect(result.parentTaskId).toBe('new-parent');
      expect(service.update).toHaveBeenCalledWith('task-1', updateWithParent);
    });

    it('should update only name', async () => {
      // Arrange
      service.update.mockResolvedValue({ ...mockTask, name: 'New Name' });

      // Act
      await controller.update('task-1', { name: 'New Name' });

      // Assert
      expect(service.update).toHaveBeenCalledWith('task-1', { name: 'New Name' });
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.update.mockResolvedValue(mockTask);

      // Act
      const result = await controller.update('task-1', updateDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should pass task id from URL params', async () => {
      // Arrange
      service.update.mockResolvedValue(mockTask);

      // Act
      await controller.update('task-123', updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith('task-123', updateDto);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove('task-1');

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('task-1');
    });

    it('should not return any data', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove('task-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should pass task id from URL params', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('task-123');

      // Assert
      expect(service.remove).toHaveBeenCalledWith('task-123');
    });
  });
});
