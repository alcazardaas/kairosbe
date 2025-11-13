import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * TimeEntriesService Unit Tests
 * Tests time entry management and statistics
 * Target Coverage: 100%
 */
describe('TimeEntriesService', () => {
  let service: TimeEntriesService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockTimeEntry = {
    id: 'entry-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    projectId: 'project-1',
    taskId: 'task-1',
    weekStartDate: new Date('2025-01-06'),
    dayOfWeek: 1,
    hours: '8',
    note: 'Development work',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProjectMember = {
    id: 'member-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    projectId: 'project-1',
    createdAt: new Date(),
  };

  const mockTimesheet = {
    id: 'timesheet-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    weekStartDate: '2025-01-06',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    // Mock getDb method
    mockDbService.getDb = vi.fn().mockReturnValue(mockDbService.db);

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeEntriesService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
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
      userId: TEST_USER_ID,
    };

    it('should return paginated time entries', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockTimeEntry]); // data query

      // Act
      const result = await service.findAll(mockQuery);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by projectId', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      await service.findAll({ ...mockQuery, projectId: 'project-1' });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should filter by taskId', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      await service.findAll({ ...mockQuery, taskId: 'task-1' });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should filter by null taskId', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      await service.findAll({ ...mockQuery, taskId: null });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      await service.findAll({
        ...mockQuery,
        weekStartDate: '2025-01-01',
        weekEndDate: '2025-12-31',
      });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should filter by dayOfWeek', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      await service.findAll({ ...mockQuery, dayOfWeek: 1 });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should sort by field and order', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      await service.findAll({ ...mockQuery, sort: 'hours:desc' });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      const result = await service.findAll({ ...mockQuery, page: 2, limit: 10 });

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return time entry by id', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimeEntry]);

      // Act
      const result = await service.findOne('entry-1');

      // Assert
      expect(result.id).toBe('entry-1');
    });

    it('should throw NotFoundException when entry not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Time entry with ID nonexistent not found',
      );
    });
  });

  describe('create', () => {
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
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember]) // membership check
        .mockResolvedValueOnce([mockTimesheet]) // timesheet check
        .mockResolvedValue([mockTimeEntry]); // insert result

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.id).toBe('entry-1');
      expect(result.hours).toBe('8');
    });

    it('should throw ForbiddenException if user not project member', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]); // no membership

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createDto)).rejects.toThrow(
        'User is not a member of project project-1',
      );
    });

    it('should throw ForbiddenException if timesheet not editable', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember]) // membership ok
        .mockResolvedValueOnce([submittedTimesheet]); // timesheet submitted

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Cannot modify time entries. Timesheet status is submitted',
      );
    });

    it('should throw ConflictException on duplicate entry', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember])
        .mockResolvedValueOnce([mockTimesheet]);

      const duplicateError = new Error('Duplicate entry');
      duplicateError.code = '23505';
      mockDbService.db.insert().values.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on foreign key violation (project)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember])
        .mockResolvedValueOnce([mockTimesheet]);

      const fkError: any = new Error('FK violation');
      fkError.code = '23503';
      fkError.constraint = 'time_entries_project_id_fkey';
      mockDbService.db.insert().values.mockRejectedValue(fkError);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Project with ID project-1 not found',
      );
    });

    it('should throw BadRequestException on check constraint violation (hours)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember])
        .mockResolvedValueOnce([mockTimesheet]);

      const checkError: any = new Error('Check violation');
      checkError.code = '23514';
      checkError.constraint = 'time_entries_hours_check';
      mockDbService.db.insert().values.mockRejectedValue(checkError);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('hours must be >= 0');
    });
  });

  describe('update', () => {
    it('should update time entry', async () => {
      // Arrange
      const updatedEntry = { ...mockTimeEntry, hours: '10' };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry]) // findOne
        .mockResolvedValueOnce([mockTimesheet]) // timesheet check
        .mockResolvedValue([updatedEntry]); // update result

      // Act
      const result = await service.update('entry-1', { hours: 10 });

      // Assert
      expect(result.hours).toBe('10');
    });

    it('should throw NotFoundException if entry not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update('nonexistent', { hours: 10 })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if timesheet not editable', async () => {
      // Arrange
      const approvedTimesheet = { ...mockTimesheet, status: 'approved' };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([approvedTimesheet]);

      // Act & Assert
      await expect(service.update('entry-1', { hours: 10 })).rejects.toThrow(ForbiddenException);
    });

    it('should update only hours', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValue([mockTimeEntry]);

      // Act
      await service.update('entry-1', { hours: 10 });

      // Assert
      expect(mockDbService.db.update).toHaveBeenCalled();
    });

    it('should update only note', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValue([mockTimeEntry]);

      // Act
      await service.update('entry-1', { note: 'Updated note' });

      // Assert
      expect(mockDbService.db.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException on invalid hours', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([mockTimesheet]);

      const checkError: any = new Error('Check violation');
      checkError.code = '23514';
      checkError.constraint = 'time_entries_hours_check';
      mockDbService.db.update().set().where.mockRejectedValue(checkError);

      // Act & Assert
      await expect(service.update('entry-1', { hours: -5 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete time entry', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry]) // findOne
        .mockResolvedValueOnce([mockTimesheet]); // timesheet check

      mockDbService.db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.remove('entry-1');

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if entry not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if timesheet not editable', async () => {
      // Arrange
      const approvedTimesheet = { ...mockTimesheet, status: 'approved' };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([approvedTimesheet]);

      // Act & Assert
      await expect(service.remove('entry-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getWeeklyHours', () => {
    it('should calculate weekly hours with daily breakdown', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([
          { dayOfWeek: 1, hours: '8' },
          { dayOfWeek: 2, hours: '8' },
          { dayOfWeek: 3, hours: '8' },
        ]);

      // Act
      const result = await service.getWeeklyHours(TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result.totalHours).toBe(24);
      expect(result.entriesCount).toBe(3);
      expect(result.hoursPerDay).toBeDefined();
      expect(Object.keys(result.hoursPerDay)).toHaveLength(7); // All 7 days
    });

    it('should return zero hours for week with no entries', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.getWeeklyHours(TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result.totalHours).toBe(0);
      expect(result.entriesCount).toBe(0);
    });

    it('should calculate week end date correctly', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.getWeeklyHours(TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result.weekEndDate).toBe('2025-01-12'); // 6 days after start
    });

    it('should round hours to 2 decimal places', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ dayOfWeek: 1, hours: '8.333' }]);

      // Act
      const result = await service.getWeeklyHours(TEST_USER_ID, '2025-01-06');

      // Assert
      expect(result.totalHours).toBe(8.33);
    });
  });

  describe('getProjectHours', () => {
    it('should calculate total hours for project', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 120 }]);

      // Act
      const result = await service.getProjectHours('project-1');

      // Assert
      expect(result).toBe(120);
    });

    it('should return 0 for project with no entries', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 0 }]);

      // Act
      const result = await service.getProjectHours('project-1');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getUserProjectStats', () => {
    it('should return user project statistics', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([
          { projectId: 'project-1', projectName: 'Project A', hours: '40' },
          { projectId: 'project-2', projectName: 'Project B', hours: '20' },
        ]);

      // Act
      const result = await service.getUserProjectStats(TEST_USER_ID, {
        weekStartDate: '2025-01-06',
      });

      // Assert
      expect(result.totalHours).toBe(60);
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].percentage).toBeCloseTo(66.67, 1);
    });

    it('should filter by weekStartDate', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([
          { projectId: 'project-1', projectName: 'Project A', hours: '40' },
        ]);

      // Act
      await service.getUserProjectStats(TEST_USER_ID, {
        weekStartDate: '2025-01-06',
      });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      await service.getUserProjectStats(TEST_USER_ID, {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should sort projects by hours descending', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([
          { projectId: 'project-1', projectName: 'Project A', hours: '20' },
          { projectId: 'project-2', projectName: 'Project B', hours: '40' },
        ]);

      // Act
      const result = await service.getUserProjectStats(TEST_USER_ID, {});

      // Assert
      expect(result.projects[0].totalHours).toBe(40); // Higher hours first
      expect(result.projects[1].totalHours).toBe(20);
    });
  });

  describe('getWeekView', () => {
    it('should return week view with entries and aggregations', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([
          // entries with project/task details
          {
            id: 'entry-1',
            project_id: 'project-1',
            project_name: 'Project A',
            project_code: 'PA',
            task_id: 'task-1',
            task_name: 'Task 1',
            day_of_week: 1,
            hours: '8',
            note: 'Work',
            created_at: new Date(),
          },
        ])
        .mockResolvedValueOnce([mockTimesheet]); // timesheet

      // Act
      const result = await service.getWeekView(TEST_USER_ID, '2025-01-06', TEST_TENANT_ID);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.dailyTotals).toHaveLength(7);
      expect(result.weeklyTotal).toBe(8);
      expect(result.timesheet).toBeDefined();
    });

    it('should auto-create draft timesheet if not exists', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([]) // no entries
        .mockResolvedValueOnce([]); // no timesheet

      mockDbService.db.insert().values.mockResolvedValue([mockTimesheet]);

      // Act
      const result = await service.getWeekView(TEST_USER_ID, '2025-01-06', TEST_TENANT_ID);

      // Assert
      expect(mockDbService.db.insert).toHaveBeenCalled();
      expect(result.timesheet).toBeDefined();
    });

    it('should calculate project breakdown', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([
          {
            id: 'entry-1',
            project_id: 'project-1',
            project_name: 'Project A',
            project_code: 'PA',
            day_of_week: 1,
            hours: '8',
          },
          {
            id: 'entry-2',
            project_id: 'project-1',
            project_name: 'Project A',
            project_code: 'PA',
            day_of_week: 2,
            hours: '8',
          },
        ])
        .mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getWeekView(TEST_USER_ID, '2025-01-06', TEST_TENANT_ID);

      // Assert
      expect(result.projectBreakdown).toHaveLength(1);
      expect(result.projectBreakdown[0].totalHours).toBe(16);
    });

    it('should format entry dates correctly', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([
          {
            id: 'entry-1',
            project_id: 'project-1',
            project_name: 'Project A',
            day_of_week: 1,
            hours: '8',
            created_at: new Date(),
          },
        ])
        .mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getWeekView(TEST_USER_ID, '2025-01-06', TEST_TENANT_ID);

      // Assert
      expect(result.entries[0].date).toBe('2025-01-07'); // Monday after 2025-01-06
    });
  });

  describe('bulkCreateOrUpdate', () => {
    const bulkDto = {
      userId: TEST_USER_ID,
      weekStartDate: '2025-01-06',
      entries: [
        { projectId: 'project-1', taskId: 'task-1', dayOfWeek: 1, hours: 8, note: 'Work' },
        { projectId: 'project-1', taskId: 'task-1', dayOfWeek: 2, hours: 8, note: 'Work' },
      ],
    };

    it('should create new entries', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember]) // membership 1
        .mockResolvedValueOnce([]) // no existing entry 1
        .mockResolvedValueOnce([mockProjectMember]) // membership 2
        .mockResolvedValueOnce([]); // no existing entry 2

      mockDbService.db.insert().values.mockResolvedValue([mockTimeEntry]);

      // Act
      const result = await service.bulkCreateOrUpdate(bulkDto, TEST_TENANT_ID);

      // Assert
      expect(result.summary.createdCount).toBe(2);
      expect(result.summary.updatedCount).toBe(0);
      expect(result.summary.errorCount).toBe(0);
    });

    it('should update existing entries', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember])
        .mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([mockProjectMember])
        .mockResolvedValueOnce([mockTimeEntry]);

      mockDbService.db.update().set().where.mockResolvedValue([mockTimeEntry]);

      // Act
      const result = await service.bulkCreateOrUpdate(bulkDto, TEST_TENANT_ID);

      // Assert
      expect(result.summary.updatedCount).toBe(2);
      expect(result.summary.createdCount).toBe(0);
    });

    it('should collect errors for invalid entries', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]); // no membership

      // Act
      const result = await service.bulkCreateOrUpdate(bulkDto, TEST_TENANT_ID);

      // Assert
      expect(result.summary.errorCount).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle mixed create/update/error', async () => {
      // Arrange
      const mixedDto = {
        ...bulkDto,
        entries: [
          bulkDto.entries[0], // create
          bulkDto.entries[1], // update
          { ...bulkDto.entries[0], projectId: 'invalid' }, // error
        ],
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockProjectMember]) // membership ok
        .mockResolvedValueOnce([]) // no existing (create)
        .mockResolvedValueOnce([mockProjectMember]) // membership ok
        .mockResolvedValueOnce([mockTimeEntry]) // existing (update)
        .mockResolvedValueOnce([]); // no membership (error)

      mockDbService.db.insert().values.mockResolvedValue([mockTimeEntry]);
      mockDbService.db.update().set().where.mockResolvedValue([mockTimeEntry]);

      // Act
      const result = await service.bulkCreateOrUpdate(mixedDto, TEST_TENANT_ID);

      // Assert
      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.updatedCount).toBe(1);
      expect(result.summary.errorCount).toBe(1);
    });
  });

  describe('copyWeek', () => {
    const copyDto = {
      userId: TEST_USER_ID,
      fromWeekStart: '2025-01-06',
      toWeekStart: '2025-01-13',
      overwriteExisting: false,
      copyNotes: true,
    };

    it('should copy entries to new week', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry, { ...mockTimeEntry, id: 'entry-2' }]) // source entries
        .mockResolvedValueOnce([]) // no existing 1
        .mockResolvedValueOnce([]); // no existing 2

      mockDbService.db.insert().values.mockResolvedValue([mockTimeEntry]);

      // Act
      const result = await service.copyWeek(copyDto, TEST_TENANT_ID);

      // Assert
      expect(result.copiedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.overwrittenCount).toBe(0);
    });

    it('should skip existing entries when overwrite is false', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry]) // source
        .mockResolvedValueOnce([mockTimeEntry]); // existing

      // Act
      const result = await service.copyWeek(copyDto, TEST_TENANT_ID);

      // Assert
      expect(result.skippedCount).toBe(1);
      expect(result.copiedCount).toBe(0);
    });

    it('should overwrite existing entries when overwrite is true', async () => {
      // Arrange
      const overwriteDto = { ...copyDto, overwriteExisting: true };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry]) // source
        .mockResolvedValueOnce([mockTimeEntry]); // existing

      mockDbService.db.update().set().where.mockResolvedValue([mockTimeEntry]);

      // Act
      const result = await service.copyWeek(overwriteDto, TEST_TENANT_ID);

      // Assert
      expect(result.overwrittenCount).toBe(1);
      expect(result.skippedCount).toBe(0);
    });

    it('should return empty result when no source entries', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.copyWeek(copyDto, TEST_TENANT_ID);

      // Assert
      expect(result.copiedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.entries).toEqual([]);
    });

    it('should optionally copy notes', async () => {
      // Arrange
      const noCopyNotesDto = { ...copyDto, copyNotes: false };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimeEntry])
        .mockResolvedValueOnce([]);

      mockDbService.db.insert().values.mockResolvedValue([{ ...mockTimeEntry, note: null }]);

      // Act
      const result = await service.copyWeek(noCopyNotesDto, TEST_TENANT_ID);

      // Assert
      expect(result.copiedCount).toBe(1);
    });
  });

  describe('validateProjectMembership', () => {
    it('should return true if user is project member', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProjectMember]);

      // Act
      const result = await service.validateProjectMembership(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'project-1',
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if user is not project member', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.validateProjectMembership(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'project-1',
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateTimesheetEditable', () => {
    it('should allow editing draft timesheet', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]);

      // Act & Assert
      await expect(
        service.validateTimesheetEditable(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06'),
      ).resolves.toBeUndefined();
    });

    it('should allow editing rejected timesheet', async () => {
      // Arrange
      const rejectedTimesheet = { ...mockTimesheet, status: 'rejected' };
      mockDbService.db.select().from().where.mockResolvedValue([rejectedTimesheet]);

      // Act & Assert
      await expect(
        service.validateTimesheetEditable(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException for submitted timesheet', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      mockDbService.db.select().from().where.mockResolvedValue([submittedTimesheet]);

      // Act & Assert
      await expect(
        service.validateTimesheetEditable(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.validateTimesheetEditable(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06'),
      ).rejects.toThrow('Cannot modify time entries. Timesheet status is submitted');
    });

    it('should throw ForbiddenException for approved timesheet', async () => {
      // Arrange
      const approvedTimesheet = { ...mockTimesheet, status: 'approved' };
      mockDbService.db.select().from().where.mockResolvedValue([approvedTimesheet]);

      // Act & Assert
      await expect(
        service.validateTimesheetEditable(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow editing when no timesheet exists', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.validateTimesheetEditable(TEST_TENANT_ID, TEST_USER_ID, '2025-01-06'),
      ).resolves.toBeUndefined();
    });
  });
});
