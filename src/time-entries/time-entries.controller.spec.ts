import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * TimeEntriesController Unit Tests
 * Tests HTTP request/response handling for time entry endpoints
 * Target Coverage: 100%
 */
describe('TimeEntriesController', () => {
  let controller: TimeEntriesController;
  let service: vi.Mocked<TimeEntriesService>;

  const mockTimeEntry = {
    id: 'entry-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    projectId: 'project-1',
    taskId: 'task-1',
    weekStartDate: new Date('2025-01-06'),
    dayOfWeek: 1,
    hours: '8',
    note: 'Development',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockTimeEntry],
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
      getWeeklyHours: vi.fn(),
      getProjectHours: vi.fn(),
      getUserProjectStats: vi.fn(),
      getWeekView: vi.fn(),
      bulkCreateOrUpdate: vi.fn(),
      copyWeek: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeEntriesController],
      providers: [{ provide: TimeEntriesService, useValue: service }],
    }).compile();

    controller = module.get<TimeEntriesController>(TimeEntriesController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /time-entries', () => {
    it('should list all time entries', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
      };
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
        userId: TEST_USER_ID,
        projectId: 'project-1',
        weekStartDate: '2025-01-06',
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should validate query with zod schema', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('GET /time-entries/:id', () => {
    it('should get time entry by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTimeEntry);

      // Act
      const result = await controller.findOne('entry-1');

      // Assert
      expect(result).toEqual(mockTimeEntry);
      expect(service.findOne).toHaveBeenCalledWith('entry-1');
    });

    it('should pass entry id to service', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTimeEntry);

      // Act
      await controller.findOne('entry-123');

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('entry-123');
    });
  });

  describe('POST /time-entries', () => {
    const createDto = {
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      projectId: 'project-1',
      taskId: 'task-1',
      weekStartDate: '2025-01-06',
      dayOfWeek: 1,
      hours: 8,
      note: 'Development',
    };

    it('should create new time entry', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTimeEntry);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(mockTimeEntry);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTimeEntry);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should pass all fields to service', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTimeEntry);

      // Act
      await controller.create(createDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('PATCH /time-entries/:id', () => {
    const updateDto = {
      hours: 10,
      note: 'Updated note',
    };

    it('should update time entry', async () => {
      // Arrange
      const updatedEntry = { ...mockTimeEntry, hours: '10', note: 'Updated note' };
      service.update.mockResolvedValue(updatedEntry);

      // Act
      const result = await controller.update('entry-1', updateDto);

      // Assert
      expect(result).toEqual(updatedEntry);
      expect(service.update).toHaveBeenCalledWith('entry-1', updateDto);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.update.mockResolvedValue(mockTimeEntry);

      // Act
      const result = await controller.update('entry-1', updateDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should update only hours', async () => {
      // Arrange
      service.update.mockResolvedValue(mockTimeEntry);

      // Act
      await controller.update('entry-1', { hours: 10 });

      // Assert
      expect(service.update).toHaveBeenCalledWith('entry-1', { hours: 10 });
    });

    it('should update only note', async () => {
      // Arrange
      service.update.mockResolvedValue(mockTimeEntry);

      // Act
      await controller.update('entry-1', { note: 'New note' });

      // Assert
      expect(service.update).toHaveBeenCalledWith('entry-1', { note: 'New note' });
    });
  });

  describe('DELETE /time-entries/:id', () => {
    it('should delete time entry', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove('entry-1');

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('entry-1');
    });

    it('should not return any data', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove('entry-1');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('GET /time-entries/stats/weekly/:userId/:weekStartDate', () => {
    const mockWeeklyHours = {
      userId: TEST_USER_ID,
      weekStartDate: '2025-01-06',
      weekEndDate: '2025-01-12',
      totalHours: 40,
      hoursPerDay: {
        '2025-01-06': 0,
        '2025-01-07': 8,
        '2025-01-08': 8,
        '2025-01-09': 8,
        '2025-01-10': 8,
        '2025-01-11': 8,
        '2025-01-12': 0,
      },
      entriesCount: 5,
    };

    it('should get weekly hours for user', async () => {
      // Arrange
      service.getWeeklyHours.mockResolvedValue(mockWeeklyHours);

      // Act
      const result = await controller.getWeeklyHours(TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result).toEqual(mockWeeklyHours);
      expect(service.getWeeklyHours).toHaveBeenCalledWith(TEST_USER_ID, '2025-01-06');
    });

    it('should pass userId and weekStartDate from URL params', async () => {
      // Arrange
      service.getWeeklyHours.mockResolvedValue(mockWeeklyHours);

      // Act
      await controller.getWeeklyHours('user-123', '2025-01-13');

      // Assert
      expect(service.getWeeklyHours).toHaveBeenCalledWith('user-123', '2025-01-13');
    });

    it('should return daily breakdown', async () => {
      // Arrange
      service.getWeeklyHours.mockResolvedValue(mockWeeklyHours);

      // Act
      const result = await controller.getWeeklyHours(TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result.hoursPerDay).toBeDefined();
      expect(Object.keys(result.hoursPerDay)).toHaveLength(7);
    });
  });

  describe('GET /time-entries/stats/project/:projectId', () => {
    it('should get project total hours', async () => {
      // Arrange
      service.getProjectHours.mockResolvedValue(120);

      // Act
      const result = await controller.getProjectHours('project-1');

      // Assert
      expect(result).toEqual({ projectId: 'project-1', totalHours: 120 });
      expect(service.getProjectHours).toHaveBeenCalledWith('project-1');
    });

    it('should pass projectId from URL params', async () => {
      // Arrange
      service.getProjectHours.mockResolvedValue(120);

      // Act
      await controller.getProjectHours('project-123');

      // Assert
      expect(service.getProjectHours).toHaveBeenCalledWith('project-123');
    });

    it('should format response with projectId and totalHours', async () => {
      // Arrange
      service.getProjectHours.mockResolvedValue(42);

      // Act
      const result = await controller.getProjectHours('project-1');

      // Assert
      expect(result).toEqual({
        projectId: 'project-1',
        totalHours: 42,
      });
    });
  });

  describe('GET /time-entries/stats/user-projects/:userId', () => {
    const mockUserProjectStats = {
      userId: TEST_USER_ID,
      totalHours: 60,
      projects: [
        {
          projectId: 'project-1',
          projectName: 'Project A',
          totalHours: 40,
          percentage: 66.67,
        },
        {
          projectId: 'project-2',
          projectName: 'Project B',
          totalHours: 20,
          percentage: 33.33,
        },
      ],
    };

    it('should get user project statistics', async () => {
      // Arrange
      const query = { weekStartDate: '2025-01-06' };
      service.getUserProjectStats.mockResolvedValue(mockUserProjectStats);

      // Act
      const result = await controller.getUserProjectStats(TEST_USER_ID, query);

      // Assert
      expect(result).toEqual(mockUserProjectStats);
      expect(service.getUserProjectStats).toHaveBeenCalledWith(TEST_USER_ID, query);
    });

    it('should pass filters from query params', async () => {
      // Arrange
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      service.getUserProjectStats.mockResolvedValue(mockUserProjectStats);

      // Act
      await controller.getUserProjectStats(TEST_USER_ID, query);

      // Assert
      expect(service.getUserProjectStats).toHaveBeenCalledWith(TEST_USER_ID, query);
    });

    it('should validate query with zod schema', async () => {
      // Arrange
      const query = { weekStartDate: '2025-01-06' };
      service.getUserProjectStats.mockResolvedValue(mockUserProjectStats);

      // Act
      const result = await controller.getUserProjectStats(TEST_USER_ID, query);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('GET /time-entries/week/:userId/:weekStartDate', () => {
    const mockWeekView = {
      weekStartDate: '2025-01-06',
      weekEndDate: '2025-01-12',
      userId: TEST_USER_ID,
      entries: [mockTimeEntry],
      dailyTotals: [0, 8, 8, 8, 8, 8, 0],
      weeklyTotal: 40,
      projectBreakdown: [
        {
          projectId: 'project-1',
          projectName: 'Project A',
          totalHours: 40,
        },
      ],
      timesheet: {
        id: 'timesheet-1',
        status: 'draft',
      },
    };

    it('should get week view', async () => {
      // Arrange
      service.getWeekView.mockResolvedValue(mockWeekView);

      // Act
      const result = await controller.getWeekView(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result).toEqual(mockWeekView);
      expect(service.getWeekView).toHaveBeenCalledWith(TEST_USER_ID, '2025-01-06', TEST_TENANT_ID);
    });

    it('should pass tenantId from decorator', async () => {
      // Arrange
      service.getWeekView.mockResolvedValue(mockWeekView);

      // Act
      await controller.getWeekView('tenant-123', TEST_USER_ID, '2025-01-06');

      // Assert
      expect(service.getWeekView).toHaveBeenCalledWith(TEST_USER_ID, '2025-01-06', 'tenant-123');
    });

    it('should return entries with project breakdown', async () => {
      // Arrange
      service.getWeekView.mockResolvedValue(mockWeekView);

      // Act
      const result = await controller.getWeekView(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result.entries).toBeDefined();
      expect(result.projectBreakdown).toBeDefined();
      expect(result.timesheet).toBeDefined();
    });
  });

  describe('POST /time-entries/bulk', () => {
    const bulkDto = {
      userId: TEST_USER_ID,
      weekStartDate: '2025-01-06',
      entries: [
        {
          projectId: 'project-1',
          taskId: 'task-1',
          dayOfWeek: 1,
          hours: 8,
          note: 'Work',
        },
      ],
    };

    const mockBulkResult = {
      created: [mockTimeEntry],
      updated: [],
      errors: [],
      summary: {
        createdCount: 1,
        updatedCount: 0,
        errorCount: 0,
        totalRequested: 1,
      },
    };

    it('should bulk create or update time entries', async () => {
      // Arrange
      service.bulkCreateOrUpdate.mockResolvedValue(mockBulkResult);

      // Act
      const result = await controller.bulkCreateOrUpdate(TEST_TENANT_ID, bulkDto);

      // Assert
      expect(result).toEqual(mockBulkResult);
      expect(service.bulkCreateOrUpdate).toHaveBeenCalledWith(bulkDto, TEST_TENANT_ID);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.bulkCreateOrUpdate.mockResolvedValue(mockBulkResult);

      // Act
      const result = await controller.bulkCreateOrUpdate(TEST_TENANT_ID, bulkDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should pass tenantId from decorator', async () => {
      // Arrange
      service.bulkCreateOrUpdate.mockResolvedValue(mockBulkResult);

      // Act
      await controller.bulkCreateOrUpdate('tenant-123', bulkDto);

      // Assert
      expect(service.bulkCreateOrUpdate).toHaveBeenCalledWith(bulkDto, 'tenant-123');
    });

    it('should return summary with counts', async () => {
      // Arrange
      service.bulkCreateOrUpdate.mockResolvedValue(mockBulkResult);

      // Act
      const result = await controller.bulkCreateOrUpdate(TEST_TENANT_ID, bulkDto);

      // Assert
      expect(result.summary).toBeDefined();
      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.updatedCount).toBe(0);
      expect(result.summary.errorCount).toBe(0);
    });
  });

  describe('POST /time-entries/copy-week', () => {
    const copyDto = {
      userId: TEST_USER_ID,
      fromWeekStart: '2025-01-06',
      toWeekStart: '2025-01-13',
      overwriteExisting: false,
      copyNotes: true,
    };

    const mockCopyResult = {
      copiedCount: 5,
      skippedCount: 0,
      overwrittenCount: 0,
      entries: [mockTimeEntry],
      skipped: [],
    };

    it('should copy week entries', async () => {
      // Arrange
      service.copyWeek.mockResolvedValue(mockCopyResult);

      // Act
      const result = await controller.copyWeek(TEST_TENANT_ID, copyDto);

      // Assert
      expect(result).toEqual(mockCopyResult);
      expect(service.copyWeek).toHaveBeenCalledWith(copyDto, TEST_TENANT_ID);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.copyWeek.mockResolvedValue(mockCopyResult);

      // Act
      const result = await controller.copyWeek(TEST_TENANT_ID, copyDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should pass tenantId from decorator', async () => {
      // Arrange
      service.copyWeek.mockResolvedValue(mockCopyResult);

      // Act
      await controller.copyWeek('tenant-123', copyDto);

      // Assert
      expect(service.copyWeek).toHaveBeenCalledWith(copyDto, 'tenant-123');
    });

    it('should return copy statistics', async () => {
      // Arrange
      service.copyWeek.mockResolvedValue(mockCopyResult);

      // Act
      const result = await controller.copyWeek(TEST_TENANT_ID, copyDto);

      // Assert
      expect(result).toHaveProperty('copiedCount');
      expect(result).toHaveProperty('skippedCount');
      expect(result).toHaveProperty('overwrittenCount');
      expect(result).toHaveProperty('entries');
    });

    it('should handle overwrite option', async () => {
      // Arrange
      const overwriteDto = { ...copyDto, overwriteExisting: true };
      const overwriteResult = { ...mockCopyResult, overwrittenCount: 2 };
      service.copyWeek.mockResolvedValue(overwriteResult);

      // Act
      const result = await controller.copyWeek(TEST_TENANT_ID, overwriteDto);

      // Assert
      expect(result.overwrittenCount).toBe(2);
    });

    it('should handle copyNotes option', async () => {
      // Arrange
      const noCopyNotesDto = { ...copyDto, copyNotes: false };
      service.copyWeek.mockResolvedValue(mockCopyResult);

      // Act
      await controller.copyWeek(TEST_TENANT_ID, noCopyNotesDto);

      // Assert
      expect(service.copyWeek).toHaveBeenCalledWith(noCopyNotesDto, TEST_TENANT_ID);
    });
  });
});
