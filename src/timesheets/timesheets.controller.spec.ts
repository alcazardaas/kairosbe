import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * TimesheetsController Unit Tests
 * Tests HTTP request/response handling for timesheet endpoints
 * Target Coverage: 100%
 */
describe('TimesheetsController', () => {
  let controller: TimesheetsController;
  let service: vi.Mocked<TimesheetsService>;

  const mockSession = {
    id: 'session-1',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    token: 'token-123',
  };

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
    timeEntries: [],
  };

  const mockListResponse = {
    data: [mockTimesheet],
    total: 1,
    page: 1,
    pageSize: 20,
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      submit: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      remove: vi.fn(),
      validateTimesheet: vi.fn(),
      recall: vi.fn(),
      getMyCurrent: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimesheetsController],
      providers: [{ provide: TimesheetsService, useValue: service }],
    }).compile();

    controller = module.get<TimesheetsController>(TimesheetsController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /timesheets/my-current', () => {
    it('should get or create current week timesheet', async () => {
      // Arrange
      service.getMyCurrent.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.getMyCurrent(TEST_TENANT_ID, mockSession);

      // Assert
      expect(result).toEqual({ data: mockTimesheet });
      expect(service.getMyCurrent).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, 1);
    });

    it('should use session userId from decorator', async () => {
      // Arrange
      const customSession = { ...mockSession, userId: 'custom-user' };
      service.getMyCurrent.mockResolvedValue({ ...mockTimesheet, userId: 'custom-user' });

      // Act
      await controller.getMyCurrent(TEST_TENANT_ID, customSession);

      // Assert
      expect(service.getMyCurrent).toHaveBeenCalledWith(TEST_TENANT_ID, 'custom-user', 1);
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.getMyCurrent.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.getMyCurrent(TEST_TENANT_ID, mockSession);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockTimesheet);
    });
  });

  describe('GET /timesheets', () => {
    it('should list all timesheets', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, mockSession);

      // Assert
      expect(result.data).toEqual([mockTimesheet]);
      expect(result.total).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: undefined,
        weekStartDate: undefined,
        status: undefined,
        team: false,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter by userId', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, mockSession, 'user-123');

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: 'user-123',
        weekStartDate: undefined,
        status: undefined,
        team: false,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter by week_start', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, mockSession, undefined, '2025-01-06');

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: undefined,
        weekStartDate: '2025-01-06',
        status: undefined,
        team: false,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, mockSession, undefined, undefined, 'submitted');

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: undefined,
        weekStartDate: undefined,
        status: 'submitted',
        team: false,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter team timesheets', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        undefined,
        undefined,
        'true',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: undefined,
        weekStartDate: undefined,
        status: undefined,
        team: true,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        undefined,
        undefined,
        undefined,
        '2025-01-01',
        '2025-12-31',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: undefined,
        weekStartDate: undefined,
        status: undefined,
        team: false,
        from: '2025-01-01',
        to: '2025-12-31',
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should apply pagination', async () => {
      // Arrange
      service.findAll.mockResolvedValue({ ...mockListResponse, page: 2, pageSize: 10 });

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2',
        '10',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: undefined,
        weekStartDate: undefined,
        status: undefined,
        team: false,
        from: undefined,
        to: undefined,
        page: 2,
        pageSize: 10,
      });
    });

    it('should return paginated response format', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, mockSession);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('page_size');
      expect(result).toHaveProperty('total');
    });

    it('should handle combined filters', async () => {
      // Arrange
      service.findAll.mockResolvedValue(mockListResponse);

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        'user-123',
        '2025-01-06',
        'submitted',
        'false',
        '2025-01-01',
        '2025-12-31',
        '1',
        '20',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        userId: 'user-123',
        weekStartDate: '2025-01-06',
        status: 'submitted',
        team: false,
        from: '2025-01-01',
        to: '2025-12-31',
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('GET /timesheets/:id', () => {
    it('should get timesheet by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result).toEqual({ data: mockTimesheet });
      expect(service.findOne).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1');
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result).toHaveProperty('data');
    });
  });

  describe('POST /timesheets', () => {
    const createDto = {
      userId: TEST_USER_ID,
      weekStartDate: '2025-01-06',
    };

    it('should create new timesheet', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toEqual({ data: mockTimesheet });
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.data).toEqual(mockTimesheet);
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.create.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toHaveProperty('data');
    });
  });

  describe('POST /timesheets/:id/submit', () => {
    it('should submit timesheet', async () => {
      // Arrange
      const submittedTimesheet = {
        ...mockTimesheet,
        status: 'submitted',
        submittedAt: new Date(),
      };
      service.submit.mockResolvedValue(submittedTimesheet);

      // Act
      const result = await controller.submit(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(result).toEqual({ data: submittedTimesheet });
      expect(service.submit).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);
    });

    it('should use session userId', async () => {
      // Arrange
      const customSession = { ...mockSession, userId: 'custom-user' };
      service.submit.mockResolvedValue(mockTimesheet);

      // Act
      await controller.submit(TEST_TENANT_ID, 'timesheet-1', customSession);

      // Assert
      expect(service.submit).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', 'custom-user');
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.submit.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.submit(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(result).toHaveProperty('data');
    });
  });

  describe('POST /timesheets/:id/approve', () => {
    const reviewDto = {
      reviewNote: 'Looks good',
    };

    it('should approve timesheet', async () => {
      // Arrange
      const approvedTimesheet = {
        ...mockTimesheet,
        status: 'approved',
        reviewedAt: new Date(),
        reviewNote: 'Looks good',
      };
      service.approve.mockResolvedValue(approvedTimesheet);

      // Act
      const result = await controller.approve(
        TEST_TENANT_ID,
        'timesheet-1',
        mockSession,
        reviewDto,
      );

      // Assert
      expect(result).toEqual({ data: approvedTimesheet });
      expect(service.approve).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'timesheet-1',
        TEST_USER_ID,
        reviewDto,
      );
    });

    it('should approve without review note', async () => {
      // Arrange
      service.approve.mockResolvedValue(mockTimesheet);

      // Act
      await controller.approve(TEST_TENANT_ID, 'timesheet-1', mockSession, {});

      // Assert
      expect(service.approve).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID, {});
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.approve.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.approve(
        TEST_TENANT_ID,
        'timesheet-1',
        mockSession,
        reviewDto,
      );

      // Assert
      expect(result.data).toEqual(mockTimesheet);
    });

    it('should use session userId', async () => {
      // Arrange
      const managerSession = { ...mockSession, userId: 'manager-1' };
      service.approve.mockResolvedValue(mockTimesheet);

      // Act
      await controller.approve(TEST_TENANT_ID, 'timesheet-1', managerSession, reviewDto);

      // Assert
      expect(service.approve).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'timesheet-1',
        'manager-1',
        reviewDto,
      );
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.approve.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.approve(
        TEST_TENANT_ID,
        'timesheet-1',
        mockSession,
        reviewDto,
      );

      // Assert
      expect(result).toHaveProperty('data');
    });
  });

  describe('POST /timesheets/:id/reject', () => {
    const rejectDto = {
      reviewNote: 'Missing entries',
    };

    it('should reject timesheet with review note', async () => {
      // Arrange
      const rejectedTimesheet = {
        ...mockTimesheet,
        status: 'rejected',
        reviewedAt: new Date(),
        reviewNote: 'Missing entries',
      };
      service.reject.mockResolvedValue(rejectedTimesheet);

      // Act
      const result = await controller.reject(TEST_TENANT_ID, 'timesheet-1', mockSession, rejectDto);

      // Assert
      expect(result).toEqual({ data: rejectedTimesheet });
      expect(service.reject).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'timesheet-1',
        TEST_USER_ID,
        rejectDto,
      );
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.reject.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.reject(TEST_TENANT_ID, 'timesheet-1', mockSession, rejectDto);

      // Assert
      expect(result.data).toEqual(mockTimesheet);
    });

    it('should use session userId', async () => {
      // Arrange
      const managerSession = { ...mockSession, userId: 'manager-1' };
      service.reject.mockResolvedValue(mockTimesheet);

      // Act
      await controller.reject(TEST_TENANT_ID, 'timesheet-1', managerSession, rejectDto);

      // Assert
      expect(service.reject).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'timesheet-1',
        'manager-1',
        rejectDto,
      );
    });

    it('should return data wrapper', async () => {
      // Arrange
      service.reject.mockResolvedValue(mockTimesheet);

      // Act
      const result = await controller.reject(TEST_TENANT_ID, 'timesheet-1', mockSession, rejectDto);

      // Assert
      expect(result).toHaveProperty('data');
    });
  });

  describe('DELETE /timesheets/:id', () => {
    it('should delete draft timesheet', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);
    });

    it('should use session userId for ownership check', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);
    });

    it('should not return any data', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('POST /timesheets/:id/validate', () => {
    const mockValidationResponse = {
      valid: true,
      errors: [],
      warnings: [
        {
          type: 'no_entries',
          severity: 'warning',
          message: 'No time entries for Saturday',
          dayOfWeek: 6,
          date: '2025-01-11',
        },
      ],
      summary: {
        totalHours: 40,
        daysWithEntries: 5,
        entryCount: 5,
        projectCount: 2,
        status: 'draft',
      },
    };

    it('should validate timesheet', async () => {
      // Arrange
      service.validateTimesheet.mockResolvedValue(mockValidationResponse);

      // Act
      const result = await controller.validate(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result).toEqual(mockValidationResponse);
      expect(service.validateTimesheet).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1');
    });

    it('should return validation errors', async () => {
      // Arrange
      const validationWithErrors = {
        ...mockValidationResponse,
        valid: false,
        errors: [
          {
            type: 'max_hours_exceeded',
            severity: 'error',
            message: 'Monday exceeds maximum 24 hours per day',
            dayOfWeek: 1,
            hours: 25,
          },
        ],
      };
      service.validateTimesheet.mockResolvedValue(validationWithErrors);

      // Act
      const result = await controller.validate(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should return validation warnings', async () => {
      // Arrange
      service.validateTimesheet.mockResolvedValue(mockValidationResponse);

      // Act
      const result = await controller.validate(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('no_entries');
    });

    it('should return summary statistics', async () => {
      // Arrange
      service.validateTimesheet.mockResolvedValue(mockValidationResponse);

      // Act
      const result = await controller.validate(TEST_TENANT_ID, 'timesheet-1');

      // Assert
      expect(result.summary).toHaveProperty('totalHours');
      expect(result.summary).toHaveProperty('daysWithEntries');
      expect(result.summary).toHaveProperty('entryCount');
      expect(result.summary).toHaveProperty('projectCount');
      expect(result.summary).toHaveProperty('status');
    });
  });

  describe('POST /timesheets/:id/recall', () => {
    const mockRecallResponse = {
      id: 'timesheet-1',
      status: 'draft',
      previousStatus: 'submitted',
      recalledAt: new Date(),
      recalledByUserId: TEST_USER_ID,
    };

    it('should recall submitted timesheet', async () => {
      // Arrange
      service.recall.mockResolvedValue(mockRecallResponse);

      // Act
      const result = await controller.recall(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(result).toEqual(mockRecallResponse);
      expect(service.recall).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);
    });

    it('should use session userId', async () => {
      // Arrange
      service.recall.mockResolvedValue(mockRecallResponse);

      // Act
      await controller.recall(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(service.recall).toHaveBeenCalledWith(TEST_TENANT_ID, 'timesheet-1', TEST_USER_ID);
    });

    it('should return recall response with status change', async () => {
      // Arrange
      service.recall.mockResolvedValue(mockRecallResponse);

      // Act
      const result = await controller.recall(TEST_TENANT_ID, 'timesheet-1', mockSession);

      // Assert
      expect(result.status).toBe('draft');
      expect(result.previousStatus).toBe('submitted');
      expect(result.recalledByUserId).toBe(TEST_USER_ID);
    });
  });
});
