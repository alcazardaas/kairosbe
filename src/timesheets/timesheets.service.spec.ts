import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * TimesheetsService Unit Tests
 * Tests timesheet lifecycle management and business logic
 * Target Coverage: 100%
 */
describe('TimesheetsService', () => {
  let service: TimesheetsService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockTimesheet = {
    id: 'timesheet-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    weekStartDate: '2025-01-06',
    status: 'draft',
    submittedAt: null,
    submittedByUserId: null,
    reviewedAt: null,
    reviewedByUserId: null,
    reviewNote: null,
    createdAt: new Date('2025-01-06T00:00:00Z'),
    updatedAt: new Date('2025-01-06T00:00:00Z'),
  };

  const mockUser = {
    id: TEST_USER_ID,
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockTimeEntry = {
    id: 'entry-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    projectId: 'project-1',
    taskId: 'task-1',
    weekStartDate: '2025-01-06',
    dayOfWeek: 1,
    hours: 8,
    note: 'Test work',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPolicy = {
    id: 'policy-1',
    tenantId: TEST_TENANT_ID,
    minHoursPerWeek: 40,
    maxHoursPerDay: 24,
    maxHoursPerWeek: 60,
    requiresApproval: true,
    allowOvertime: false,
    weekStartDay: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimesheetsService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should list all timesheets for tenant', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 2 }]) // count query
        .mockResolvedValueOnce([
          { ...mockTimesheet, user: mockUser },
          { ...mockTimesheet, id: 'timesheet-2', user: mockUser },
        ]); // timesheets query

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]); // hours query

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter timesheets by userId', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ ...mockTimesheet, user: mockUser }]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        userId: TEST_USER_ID,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(TEST_USER_ID);
    });

    it('should filter timesheets by weekStartDate', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ ...mockTimesheet, user: mockUser }]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        weekStartDate: '2025-01-06',
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].weekStartDate).toBe('2025-01-06');
    });

    it('should filter timesheets by status', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted', user: mockUser };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([submittedTimesheet]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        status: 'submitted',
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('submitted');
    });

    it('should filter team timesheets for managers', async () => {
      // Arrange
      const directReports = [{ userId: 'employee-1' }, { userId: 'employee-2' }];

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce(directReports) // direct reports query
        .mockResolvedValueOnce([{ count: 2 }]) // count query
        .mockResolvedValueOnce([
          { ...mockTimesheet, userId: 'employee-1', user: mockUser },
          { ...mockTimesheet, id: 'timesheet-2', userId: 'employee-2', user: mockUser },
        ]); // timesheets query

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, 'manager-1', { team: true });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].userId).toBe('employee-1');
      expect(result.data[1].userId).toBe('employee-2');
    });

    it('should return empty array when manager has no direct reports', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]); // No direct reports

      // Act
      const result = await service.findAll(TEST_TENANT_ID, 'manager-1', { team: true });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by date range (from)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ ...mockTimesheet, user: mockUser }]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        from: '2025-01-01',
      });

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('should filter by date range (to)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ ...mockTimesheet, user: mockUser }]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        to: '2025-12-31',
      });

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('should apply pagination', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([{ ...mockTimesheet, user: mockUser }]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 40 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        page: 2,
        pageSize: 10,
      });

      // Assert
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(50);
    });

    it('should include total hours for each timesheet', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ ...mockTimesheet, user: mockUser }]);

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([{ total: 42 }]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result.data[0]).toHaveProperty('totalHours');
      expect(result.data[0].totalHours).toBe(42);
    });
  });

  describe('findOne', () => {
    it('should return timesheet with time entries', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet]) // timesheet query
        .mockResolvedValueOnce([mockTimeEntry]); // time entries query

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.id).toBe('timesheet-1');
      expect(result.timeEntries).toHaveLength(1);
      expect(result.timeEntries[0].id).toBe('entry-1');
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Timesheet with ID nonexistent not found',
      );
    });

    it('should filter time entries by tenant and user', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.timeEntries[0].tenantId).toBe(TEST_TENANT_ID);
      expect(result.timeEntries[0].userId).toBe(TEST_USER_ID);
    });

    it('should return timesheet with empty entries array', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet]) // timesheet found
        .mockResolvedValueOnce([]); // no entries

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.timeEntries).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create new draft timesheet', async () => {
      // Arrange
      const createDto = {
        userId: TEST_USER_ID,
        weekStartDate: '2025-01-06',
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([]) // no existing
        .mockResolvedValue([mockTimesheet]); // insert result

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.id).toBe('timesheet-1');
      expect(result.status).toBe('draft');
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.weekStartDate).toBe('2025-01-06');
    });

    it('should throw BadRequestException if timesheet already exists', async () => {
      // Arrange
      const createDto = {
        userId: TEST_USER_ID,
        weekStartDate: '2025-01-06',
      };

      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]); // existing found

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(BadRequestException);

      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(
        `Timesheet already exists for user ${TEST_USER_ID} and week 2025-01-06`,
      );
    });

    it('should create timesheet with correct tenant isolation', async () => {
      // Arrange
      const createDto = {
        userId: TEST_USER_ID,
        weekStartDate: '2025-01-06',
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([])
        .mockResolvedValue([mockTimesheet]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.tenantId).toBe(TEST_TENANT_ID);
    });
  });

  describe('submit', () => {
    it('should submit draft timesheet', async () => {
      // Arrange
      const submittedTimesheet = {
        ...mockTimesheet,
        status: 'submitted',
        submittedAt: new Date(),
        submittedByUserId: TEST_USER_ID,
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([mockTimesheet]) // find timesheet
        .mockResolvedValue([submittedTimesheet]); // update result

      // Act
      const result = await service.submit(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);

      // Assert
      expect(result.status).toBe('submitted');
      expect(result.submittedAt).toBeDefined();
      expect(result.submittedByUserId).toBe(TEST_USER_ID);
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.submit(TEST_TENANT_ID, 'nonexistent', TEST_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if timesheet not in draft status', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      mockDbService.db.select().from().where.mockResolvedValue([submittedTimesheet]);

      // Act & Assert
      await expect(service.submit(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.submit(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'Timesheet cannot be submitted. Current status: submitted',
      );
    });

    it('should throw ForbiddenException if user does not own timesheet', async () => {
      // Arrange
      const otherUserTimesheet = { ...mockTimesheet, userId: 'other-user' };
      mockDbService.db.select().from().where.mockResolvedValue([otherUserTimesheet]);

      // Act & Assert
      await expect(service.submit(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.submit(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'You can only submit your own timesheets',
      );
    });

    it('should update updatedAt timestamp', async () => {
      // Arrange
      const submittedTimesheet = {
        ...mockTimesheet,
        status: 'submitted',
        updatedAt: new Date(),
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([mockTimesheet])
        .mockResolvedValue([submittedTimesheet]);

      // Act
      const result = await service.submit(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);

      // Assert
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('approve', () => {
    it('should approve submitted timesheet', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      const approvedTimesheet = {
        ...mockTimesheet,
        status: 'approved',
        reviewedAt: new Date(),
        reviewedByUserId: 'manager-1',
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([submittedTimesheet]) // find timesheet
        .mockResolvedValue([approvedTimesheet]); // update result

      // Act
      const result = await service.approve(TEST_TENANT_ID, 'timesheet-1', 'manager-1');

      // Assert
      expect(result.status).toBe('approved');
      expect(result.reviewedAt).toBeDefined();
      expect(result.reviewedByUserId).toBe('manager-1');
    });

    it('should approve with review note', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      const approvedTimesheet = {
        ...mockTimesheet,
        status: 'approved',
        reviewNote: 'Looks good',
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([submittedTimesheet])
        .mockResolvedValue([approvedTimesheet]);

      // Act
      const result = await service.approve(TEST_TENANT_ID, 'timesheet-1', 'manager-1', {
        reviewNote: 'Looks good',
      });

      // Assert
      expect(result.reviewNote).toBe('Looks good');
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.approve(TEST_TENANT_ID, 'nonexistent', 'manager-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if timesheet not in submitted status', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]); // draft status

      // Act & Assert
      await expect(service.approve(TEST_TENANT_ID, 'timesheet-1', 'manager-1')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.approve(TEST_TENANT_ID, 'timesheet-1', 'manager-1')).rejects.toThrow(
        'Timesheet cannot be approved. Current status: draft',
      );
    });
  });

  describe('reject', () => {
    it('should reject submitted timesheet with review note', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      const rejectedTimesheet = {
        ...mockTimesheet,
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedByUserId: 'manager-1',
        reviewNote: 'Missing entries',
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([submittedTimesheet]) // find timesheet
        .mockResolvedValue([rejectedTimesheet]); // update result

      // Act
      const result = await service.reject(TEST_TENANT_ID, 'timesheet-1', 'manager-1', {
        reviewNote: 'Missing entries',
      });

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.reviewedAt).toBeDefined();
      expect(result.reviewedByUserId).toBe('manager-1');
      expect(result.reviewNote).toBe('Missing entries');
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.reject(TEST_TENANT_ID, 'nonexistent', 'manager-1', {
          reviewNote: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if timesheet not in submitted status', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]); // draft status

      // Act & Assert
      await expect(
        service.reject(TEST_TENANT_ID, 'timesheet-1', 'manager-1', {
          reviewNote: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reject(TEST_TENANT_ID, 'timesheet-1', 'manager-1', {
          reviewNote: 'Test',
        }),
      ).rejects.toThrow('Timesheet cannot be rejected. Current status: draft');
    });

    it('should throw BadRequestException if review note is missing', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      mockDbService.db.select().from().where.mockResolvedValue([submittedTimesheet]);

      // Act & Assert
      await expect(service.reject(TEST_TENANT_ID, 'timesheet-1', 'manager-1', {})).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.reject(TEST_TENANT_ID, 'timesheet-1', 'manager-1', {})).rejects.toThrow(
        'Review note is required when rejecting a timesheet',
      );
    });
  });

  describe('remove', () => {
    it('should delete draft timesheet', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]);
      mockDbService.db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.remove(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove(TEST_TENANT_ID, 'nonexistent', TEST_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if timesheet not in draft status', async () => {
      // Arrange
      const submittedTimesheet = { ...mockTimesheet, status: 'submitted' };
      mockDbService.db.select().from().where.mockResolvedValue([submittedTimesheet]);

      // Act & Assert
      await expect(service.remove(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.remove(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'Only draft timesheets can be deleted',
      );
    });

    it('should throw ForbiddenException if user does not own timesheet', async () => {
      // Arrange
      const otherUserTimesheet = { ...mockTimesheet, userId: 'other-user' };
      mockDbService.db.select().from().where.mockResolvedValue([otherUserTimesheet]);

      // Act & Assert
      await expect(service.remove(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.remove(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'You can only delete your own draft timesheets',
      );
    });
  });

  describe('validateTimesheet', () => {
    it('should validate timesheet successfully', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet]) // timesheet query
        .mockResolvedValueOnce([mockPolicy]) // policy query
        .mockResolvedValueOnce([mockTimeEntry]); // entries query

      // Act
      const result = await service.validateTimesheet(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.valid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.validateTimesheet(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should detect max hours per day violation', async () => {
      // Arrange
      const excessiveEntry = {
        ...mockTimeEntry,
        hours: 25, // Exceeds 24-hour max
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([mockPolicy])
        .mockResolvedValueOnce([excessiveEntry]);

      // Act
      const result = await service.validateTimesheet(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('max_hours_exceeded');
    });

    it('should warn about missing days', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([mockPolicy])
        .mockResolvedValueOnce([mockTimeEntry]); // Only 1 entry for 1 day

      // Act
      const result = await service.validateTimesheet(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w: any) => w.type === 'no_entries')).toBe(true);
    });

    it('should warn about low weekly hours', async () => {
      // Arrange
      const lowHoursEntry = { ...mockTimeEntry, hours: 5 };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([mockPolicy])
        .mockResolvedValueOnce([lowHoursEntry]);

      // Act
      const result = await service.validateTimesheet(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.warnings.some((w: any) => w.type === 'low_hours')).toBe(true);
    });

    it('should include summary statistics', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([mockPolicy])
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      const result = await service.validateTimesheet(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.summary).toHaveProperty('totalHours');
      expect(result.summary).toHaveProperty('daysWithEntries');
      expect(result.summary).toHaveProperty('entryCount');
      expect(result.summary).toHaveProperty('projectCount');
      expect(result.summary).toHaveProperty('status');
    });

    it('should validate without policy (no max hours check)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockTimesheet])
        .mockResolvedValueOnce([]) // No policy
        .mockResolvedValueOnce([mockTimeEntry]);

      // Act
      const result = await service.validateTimesheet(TEST_TENANT_ID, 'timesheet-1');

      // Assert: Should not have max_hours_exceeded errors
      expect(result.errors.filter((e: any) => e.type === 'max_hours_exceeded')).toHaveLength(0);
    });
  });

  describe('recall', () => {
    it('should recall submitted timesheet back to draft', async () => {
      // Arrange
      const submittedTimesheet = {
        ...mockTimesheet,
        status: 'submitted',
        submittedAt: new Date(),
        submittedByUserId: TEST_USER_ID,
        reviewedAt: null,
      };

      const recalledTimesheet = {
        ...mockTimesheet,
        status: 'draft',
        submittedAt: null,
        submittedByUserId: null,
      };

      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([submittedTimesheet]) // find timesheet
        .mockResolvedValue([recalledTimesheet]); // update result

      // Act
      const result = await service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);

      // Assert
      expect(result.status).toBe('draft');
      expect(result.previousStatus).toBe('submitted');
      expect(result.recalledByUserId).toBe(TEST_USER_ID);
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.recall(TEST_TENANT_ID, 'nonexistent', TEST_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if timesheet not in submitted status', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]); // draft status

      // Act & Assert
      await expect(service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'Cannot recall timesheet. Current status: draft. Only submitted timesheets can be recalled.',
      );
    });

    it('should throw ForbiddenException if user does not own timesheet', async () => {
      // Arrange
      const otherUserTimesheet = {
        ...mockTimesheet,
        status: 'submitted',
        userId: 'other-user',
      };
      mockDbService.db.select().from().where.mockResolvedValue([otherUserTimesheet]);

      // Act & Assert
      await expect(service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'You can only recall your own timesheets',
      );
    });

    it('should throw BadRequestException if timesheet already reviewed', async () => {
      // Arrange
      const reviewedTimesheet = {
        ...mockTimesheet,
        status: 'submitted',
        reviewedAt: new Date(),
      };
      mockDbService.db.select().from().where.mockResolvedValue([reviewedTimesheet]);

      // Act & Assert
      await expect(service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.recall(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID)).rejects.toThrow(
        'Cannot recall timesheet that has already been reviewed',
      );
    });
  });

  describe('getMyCurrent', () => {
    it('should return existing current week timesheet', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]);

      // Act
      const result = await service.getMyCurrent(TEST_TENANT_ID, TEST_USER_ID, 1);

      // Assert
      expect(result.id).toBe('timesheet-1');
      expect(result.autoCreated).toBe(false);
    });

    it('should create new timesheet for current week if not exists', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([]) // no existing
        .mockResolvedValue([mockTimesheet]); // insert result

      // Act
      const result = await service.getMyCurrent(TEST_TENANT_ID, TEST_USER_ID, 1);

      // Assert
      expect(result.autoCreated).toBe(true);
      expect(result.status).toBe('draft');
    });

    it('should calculate week start based on policy (Monday=1)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([])
        .mockResolvedValue([mockTimesheet]);

      // Act
      const result = await service.getMyCurrent(TEST_TENANT_ID, TEST_USER_ID, 1);

      // Assert
      expect(result.weekStartDate).toBeDefined();
    });

    it('should calculate week start based on policy (Sunday=0)', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValue([])
        .mockResolvedValue([mockTimesheet]);

      // Act
      const result = await service.getMyCurrent(TEST_TENANT_ID, TEST_USER_ID, 0);

      // Assert
      expect(result.weekStartDate).toBeDefined();
    });

    it('should handle default week start policy', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockTimesheet]);

      // Act
      const result = await service.getMyCurrent(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
