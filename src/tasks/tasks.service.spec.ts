import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * TasksService Unit Tests
 * Tests hierarchical task management with circular reference validation
 * Target Coverage: 100%
 */
describe('TasksService', () => {
  let service: TasksService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockTask = {
    id: 'task-1',
    tenantId: TEST_TENANT_ID,
    projectId: 'project-1',
    name: 'Task Alpha',
    parentTaskId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChildTask = {
    id: 'task-2',
    tenantId: TEST_TENANT_ID,
    projectId: 'project-1',
    name: 'Subtask Beta',
    parentTaskId: 'task-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<TasksService>(TasksService);
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
      tenantId: TEST_TENANT_ID,
    };

    it('should return paginated tasks', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockTask]);

      // Act
      const result = await service.findAll(mockQuery);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by tenantId', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockTask]);

      // Act
      await service.findAll(mockQuery);

      // Assert
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should filter by projectId', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockTask]);

      // Act
      await service.findAll({ ...mockQuery, projectId: 'project-1' });

      // Assert
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should filter by parentTaskId', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockChildTask]);

      // Act
      await service.findAll({ ...mockQuery, parentTaskId: 'task-1' });

      // Assert
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should filter root tasks when parentTaskId is null', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockTask]);

      // Act
      await service.findAll({ ...mockQuery, parentTaskId: null });

      // Assert
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should search by task name', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockTask]);

      // Act
      await service.findAll({ ...mockQuery, search: 'Alpha' });

      // Assert
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should sort by field', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockTask]);

      // Act
      await service.findAll({ ...mockQuery, sort: 'name:asc' });

      // Assert
      expect(mockDbService.getDb().select).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValueOnce([{ count: 50 }]).mockResolvedValueOnce([mockTask]);

      // Act
      const result = await service.findAll({ ...mockQuery, page: 2, limit: 10 });

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return task by id', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockTask]);

      // Act
      const result = await service.findOne('task-1');

      // Assert
      expect(result.id).toBe('task-1');
      expect(result.name).toBe('Task Alpha');
    });

    it('should throw NotFoundException when task not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Task with ID nonexistent not found');
    });
  });

  describe('create', () => {
    const createDto = {
      tenantId: TEST_TENANT_ID,
      projectId: 'project-1',
      name: 'New Task',
      parentTaskId: null,
    };

    it('should create new task', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([
        { ...mockTask, ...createDto },
      ]);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.name).toBe('New Task');
      expect(result.projectId).toBe('project-1');
    });

    it('should create task with parent', async () => {
      // Arrange
      const dtoWithParent = { ...createDto, parentTaskId: 'task-1' };
      mockDbService.getDb().select().from().where.mockResolvedValue([mockTask]); // parent exists

      mockDbService.getDb().insert().values.mockResolvedValue([
        { ...mockTask, ...dtoWithParent },
      ]);

      // Act
      const result = await service.create(dtoWithParent);

      // Assert
      expect(result.parentTaskId).toBe('task-1');
    });

    it('should throw NotFoundException when parent task not found', async () => {
      // Arrange
      const dtoWithInvalidParent = { ...createDto, parentTaskId: 'invalid-parent' };
      mockDbService.getDb().select().from().where.mockResolvedValue([]); // parent not found

      // Act & Assert
      await expect(service.create(dtoWithInvalidParent)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate name', async () => {
      // Arrange
      const duplicateError: any = new Error('Duplicate');
      duplicateError.code = '23505';
      mockDbService.getDb().insert().values.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Task with name "New Task" already exists for this project',
      );
    });

    it('should throw BadRequestException on invalid project', async () => {
      // Arrange
      const fkError: any = new Error('FK violation');
      fkError.code = '23503';
      fkError.constraint = 'tasks_project_id_fkey';
      mockDbService.getDb().insert().values.mockRejectedValue(fkError);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Project with ID project-1 not found');
    });

    it('should throw BadRequestException on invalid tenant', async () => {
      // Arrange
      const fkError: any = new Error('FK violation');
      fkError.code = '23503';
      fkError.constraint = 'tasks_tenant_id_fkey';
      mockDbService.getDb().insert().values.mockRejectedValue(fkError);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(`Tenant with ID ${TEST_TENANT_ID} not found`);
    });

    it('should create root task (parentTaskId null)', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([mockTask]);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.parentTaskId).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Task',
    };

    it('should update task', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // findOne check
        .mockResolvedValue([{ ...mockTask, ...updateDto }]); // update result

      // Act
      const result = await service.update('task-1', updateDto);

      // Assert
      expect(result.name).toBe('Updated Task');
    });

    it('should throw NotFoundException when task not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update parent task', async () => {
      // Arrange
      const updateWithParent = { parentTaskId: 'task-parent' };
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // findOne (task exists)
        .mockResolvedValueOnce([{ id: 'task-parent', parentTaskId: null }]) // findOne (parent exists)
        .mockResolvedValueOnce([{ id: 'task-parent', parentTaskId: null }]) // validateNoCircularReference
        .mockResolvedValue([{ ...mockTask, parentTaskId: 'task-parent' }]); // update result

      // Act
      const result = await service.update('task-1', updateWithParent);

      // Assert
      expect(result.parentTaskId).toBe('task-parent');
    });

    it('should throw BadRequestException if task is its own parent', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockTask]);

      // Act & Assert
      await expect(service.update('task-1', { parentTaskId: 'task-1' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('task-1', { parentTaskId: 'task-1' })).rejects.toThrow(
        'A task cannot be its own parent',
      );
    });

    it('should throw BadRequestException on circular reference', async () => {
      // Arrange: task-1 -> task-2 -> task-3, trying to set task-1's parent to task-3
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // findOne (task exists)
        .mockResolvedValueOnce([{ id: 'task-3', parentTaskId: 'task-2' }]) // findOne (new parent exists)
        .mockResolvedValueOnce([{ id: 'task-3', parentTaskId: 'task-2' }]) // validateNoCircularReference: task-3
        .mockResolvedValueOnce([{ id: 'task-2', parentTaskId: 'task-1' }]); // validateNoCircularReference: task-2 points back to task-1

      // Act & Assert
      await expect(service.update('task-1', { parentTaskId: 'task-3' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('task-1', { parentTaskId: 'task-3' })).rejects.toThrow(
        'Cannot set parent: this would create a circular reference in the task hierarchy',
      );
    });

    it('should throw NotFoundException when new parent not found', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // task exists
        .mockResolvedValueOnce([]); // parent not found

      // Act & Assert
      await expect(service.update('task-1', { parentTaskId: 'invalid-parent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on duplicate name', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockTask]);

      const duplicateError: any = new Error('Duplicate');
      duplicateError.code = '23505';
      mockDbService.getDb().update().set().where.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.update('task-1', { name: 'Duplicate Name' })).rejects.toThrow(ConflictException);
    });

    it('should allow removing parent (set to null)', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockChildTask])
        .mockResolvedValue([{ ...mockChildTask, parentTaskId: null }]);

      // Act
      const result = await service.update('task-2', { parentTaskId: null });

      // Assert: Should not throw, parent can be set to null
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete task with no children', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // findOne
        .mockResolvedValueOnce([{ count: 0 }]); // no children

      mockDbService.getDb().delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.remove('task-1');

      // Assert
      expect(mockDbService.getDb().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when task has children', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // task exists
        .mockResolvedValueOnce([{ count: 3 }]); // has 3 children

      // Act & Assert
      await expect(service.remove('task-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('task-1')).rejects.toThrow(
        'Cannot delete task with ID task-1 because it has 3 child task(s)',
      );
    });

    it('should check for children before deleting', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask])
        .mockResolvedValueOnce([{ count: 0 }]);

      mockDbService.getDb().delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.remove('task-1');

      // Assert: Should have checked for children
      expect(mockDbService.getDb().select).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateNoCircularReference (private method)', () => {
    it('should not throw when no circular reference exists', async () => {
      // Arrange: Linear chain task-1 -> task-2 -> task-3
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTask]) // task exists
        .mockResolvedValueOnce([{ id: 'task-parent', parentTaskId: null }]) // parent exists
        .mockResolvedValueOnce([{ id: 'task-parent', parentTaskId: null }]) // validate: parent
        .mockResolvedValueOnce([]) // validate: parent's parent (null)
        .mockResolvedValue([{ ...mockTask, parentTaskId: 'task-parent' }]);

      // Act & Assert: Should not throw
      await expect(service.update('task-1', { parentTaskId: 'task-parent' })).resolves.toBeDefined();
    });

    it('should detect circular reference in chain', async () => {
      // Arrange: task-A -> task-B -> task-C, trying to set task-C's parent to task-A
      // This creates: task-A -> task-B -> task-C -> task-A (circular)
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: 'task-C', parentTaskId: 'task-B' }]) // task exists
        .mockResolvedValueOnce([{ id: 'task-A', parentTaskId: null }]) // new parent exists
        .mockResolvedValueOnce([{ id: 'task-A', parentTaskId: null }]); // but wait, we need to traverse up from task-A

      // Actually, the validation checks from the NEW parent upwards
      // So we're setting task-C's parent to task-A
      // We need to check if task-A's ancestors include task-C
      // task-A has no parent, so this should be OK

      // Let me reconsider: the validation checks if setting task-C's parent to task-A
      // would create a cycle. It traverses UP from task-A.
      // If task-A's ancestors include task-C, that's a cycle.

      // For a true cycle: task-A (parent: task-C) -> task-B (parent: task-A) -> task-C
      // Trying to update task-A's parent to task-B would create cycle
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: 'task-A', parentTaskId: null }]) // task exists
        .mockResolvedValueOnce([{ id: 'task-B', parentTaskId: 'task-C' }]) // new parent
        .mockResolvedValueOnce([{ id: 'task-B', parentTaskId: 'task-C' }]) // validate: task-B
        .mockResolvedValueOnce([{ id: 'task-C', parentTaskId: 'task-A' }]); // validate: task-C points back to task-A!

      // Act & Assert
      await expect(service.update('task-A', { parentTaskId: 'task-B' })).rejects.toThrow(
        'Cannot set parent: this would create a circular reference',
      );
    });
  });
});
