/**
 * EXAMPLE TEST FILE - Timesheets Controller
 *
 * This demonstrates testing patterns for NestJS controllers.
 * Use this as a reference when writing controller tests.
 *
 * NOTE: This is an example file and not run in the actual test suite.
 * The real timesheets.controller.spec.ts will be created in src/timesheets/ directory.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TimesheetsController } from '../../src/timesheets/timesheets.controller';
import { TimesheetsService } from '../../src/timesheets/timesheets.service';
import { TimesheetBuilder, UserBuilder } from '../builders';
import {
  TEST_TENANT_ID,
  TEST_USER_ID,
  TEST_MANAGER_ID,
  DEFAULT_PAGINATION,
} from '../constants';

/**
 * Example controller tests
 * Demonstrates:
 * - Controller testing with mocked service
 * - Request/response handling
 * - Authorization checks
 * - Query parameter handling
 * - Error responses
 */
describe('TimesheetsController (Example)', () => {
  let controller: TimesheetsController;
  let mockService: jest.Mocked<TimesheetsService>;

  beforeEach(async () => {
    // Create mock service
    mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      submit: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      recall: jest.fn(),
      validate: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimesheetsController],
      providers: [
        { provide: TimesheetsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<TimesheetsController>(TimesheetsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * PATTERN: Testing GET endpoints
   * - Test query parameter handling
   * - Test response format
   * - Test pagination
   */
  describe('findAll (GET /timesheets)', () => {
    it('should return paginated timesheets for current user', async () => {
      // Arrange
      const tenantId = TEST_TENANT_ID;
      const query = {
        page: 1,
        limit: 20,
        userId: TEST_USER_ID,
      };

      const expectedResponse = {
        data: [
          new TimesheetBuilder().withUserId(TEST_USER_ID).build(),
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
        },
      };

      mockService.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.findAll(tenantId, query);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockService.findAll).toHaveBeenCalledWith(tenantId, query);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const query = {
        ...DEFAULT_PAGINATION,
        status: 'submitted',
      };

      mockService.findAll.mockResolvedValue({
        data: [new TimesheetBuilder().asSubmitted().build()],
        meta: { page: 1, limit: 20, total: 1 },
      });

      // Act
      await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({ status: 'submitted' }),
      );
    });

    it('should filter by date range when provided', async () => {
      // Arrange
      const query = {
        ...DEFAULT_PAGINATION,
        from: '2025-01-01',
        to: '2025-01-31',
      };

      mockService.findAll.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0 },
      });

      // Act
      await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          from: '2025-01-01',
          to: '2025-01-31',
        }),
      );
    });

    it('should return team timesheets for managers', async () => {
      // Arrange
      const query = {
        ...DEFAULT_PAGINATION,
        team: true,
      };

      mockService.findAll.mockResolvedValue({
        data: [
          new TimesheetBuilder().withUserId('team-member-1').build(),
          new TimesheetBuilder().withUserId('team-member-2').build(),
        ],
        meta: { page: 1, limit: 20, total: 2 },
      });

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(mockService.findAll).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({ team: true }),
      );
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      const query = {}; // No pagination params

      mockService.findAll.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0 },
      });

      // Act
      await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          page: 1,
          limit: 20,
        }),
      );
    });
  });

  /**
   * PATTERN: Testing GET by ID endpoints
   * - Test successful retrieval
   * - Test not found errors
   */
  describe('findOne (GET /timesheets/:id)', () => {
    it('should return timesheet with time entries', async () => {
      // Arrange
      const timesheetId = 'timesheet-123';
      const expected = new TimesheetBuilder()
        .withId(timesheetId)
        .build();

      mockService.findOne.mockResolvedValue(expected);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, timesheetId);

      // Assert
      expect(result).toEqual(expected);
      expect(mockService.findOne).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        timesheetId,
      );
    });

    it('should throw NotFoundException when timesheet not found', async () => {
      // Arrange
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Timesheet not found'),
      );

      // Act & Assert
      await expect(
        controller.findOne(TEST_TENANT_ID, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * PATTERN: Testing POST endpoints
   * - Test successful creation
   * - Test validation
   * - Test DTOs
   */
  describe('create (POST /timesheets)', () => {
    it('should create timesheet with valid data', async () => {
      // Arrange
      const createDto = {
        userId: TEST_USER_ID,
        weekStartDate: '2025-01-06',
      };

      const expected = new TimesheetBuilder()
        .withUserId(TEST_USER_ID)
        .withWeekStartDate('2025-01-06')
        .asDraft()
        .build();

      mockService.create.mockResolvedValue(expected);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toEqual(expected);
      expect(result.status).toBe('draft');
      expect(mockService.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto);
    });

    it('should transform camelCase DTO to service call', async () => {
      // Arrange
      const createDto = {
        userId: TEST_USER_ID,
        weekStartDate: '2025-01-06', // camelCase from API
      };

      mockService.create.mockResolvedValue(
        new TimesheetBuilder().build(),
      );

      // Act
      await controller.create(TEST_TENANT_ID, createDto);

      // Assert: Service receives same format (transformation happens in service)
      expect(mockService.create).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          userId: TEST_USER_ID,
          weekStartDate: '2025-01-06',
        }),
      );
    });
  });

  /**
   * PATTERN: Testing POST action endpoints
   * - Test state transitions
   * - Test authorization
   * - Test business rules
   */
  describe('submit (POST /timesheets/:id/submit)', () => {
    it('should submit draft timesheet', async () => {
      // Arrange
      const timesheetId = 'timesheet-123';
      const expected = new TimesheetBuilder()
        .withId(timesheetId)
        .asSubmitted()
        .build();

      mockService.submit.mockResolvedValue(expected);

      // Act
      const result = await controller.submit(TEST_TENANT_ID, timesheetId);

      // Assert
      expect(result.status).toBe('submitted');
      expect(result.submittedAt).toBeDefined();
      expect(mockService.submit).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        timesheetId,
      );
    });

    it('should throw error when timesheet already submitted', async () => {
      // Arrange
      mockService.submit.mockRejectedValue(
        new ForbiddenException('Timesheet already submitted'),
      );

      // Act & Assert
      await expect(
        controller.submit(TEST_TENANT_ID, 'timesheet-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approve (POST /timesheets/:id/approve)', () => {
    it('should approve submitted timesheet when user is manager', async () => {
      // Arrange
      const timesheetId = 'timesheet-123';
      const approveDto = {
        userId: TEST_MANAGER_ID,
        role: 'manager',
      };

      const expected = new TimesheetBuilder()
        .withId(timesheetId)
        .asApproved(TEST_MANAGER_ID)
        .build();

      mockService.approve.mockResolvedValue(expected);

      // Act
      const result = await controller.approve(
        TEST_TENANT_ID,
        timesheetId,
        approveDto,
      );

      // Assert
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe(TEST_MANAGER_ID);
      expect(result.approvedAt).toBeDefined();
    });

    it('should throw ForbiddenException when user is not manager', async () => {
      // Arrange
      const approveDto = {
        userId: TEST_USER_ID,
        role: 'employee', // Not a manager
      };

      mockService.approve.mockRejectedValue(
        new ForbiddenException('Only managers can approve timesheets'),
      );

      // Act & Assert
      await expect(
        controller.approve(TEST_TENANT_ID, 'timesheet-123', approveDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject (POST /timesheets/:id/reject)', () => {
    it('should reject timesheet with reason', async () => {
      // Arrange
      const timesheetId = 'timesheet-123';
      const rejectDto = {
        userId: TEST_MANAGER_ID,
        role: 'manager',
        reason: 'Incomplete hours',
      };

      const expected = new TimesheetBuilder()
        .withId(timesheetId)
        .asRejected('Incomplete hours')
        .build();

      mockService.reject.mockResolvedValue(expected);

      // Act
      const result = await controller.reject(
        TEST_TENANT_ID,
        timesheetId,
        rejectDto,
      );

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Incomplete hours');
    });

    it('should require rejection reason', async () => {
      // Arrange
      const rejectDto = {
        userId: TEST_MANAGER_ID,
        role: 'manager',
        reason: '', // Empty reason
      };

      mockService.reject.mockRejectedValue(
        new ForbiddenException('Rejection reason is required'),
      );

      // Act & Assert
      await expect(
        controller.reject(TEST_TENANT_ID, 'timesheet-123', rejectDto),
      ).rejects.toThrow();
    });
  });

  /**
   * PATTERN: Testing DELETE endpoints
   * - Test successful deletion
   * - Test authorization
   * - Test business rules (only draft can be deleted)
   */
  describe('delete (DELETE /timesheets/:id)', () => {
    it('should delete draft timesheet', async () => {
      // Arrange
      const timesheetId = 'timesheet-123';
      mockService.delete.mockResolvedValue(undefined);

      // Act
      await controller.delete(TEST_TENANT_ID, timesheetId);

      // Assert
      expect(mockService.delete).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        timesheetId,
      );
    });

    it('should throw error when timesheet is not draft', async () => {
      // Arrange
      mockService.delete.mockRejectedValue(
        new ForbiddenException('Only draft timesheets can be deleted'),
      );

      // Act & Assert
      await expect(
        controller.delete(TEST_TENANT_ID, 'timesheet-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /**
   * PATTERN: Testing custom validation endpoints
   */
  describe('validate (POST /timesheets/:id/validate)', () => {
    it('should return validation result', async () => {
      // Arrange
      const timesheetId = 'timesheet-123';
      const expected = {
        valid: true,
        errors: [],
        warnings: [],
      };

      mockService.validate.mockResolvedValue(expected);

      // Act
      const result = await controller.validate(TEST_TENANT_ID, timesheetId);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors when timesheet invalid', async () => {
      // Arrange
      const expected = {
        valid: false,
        errors: [
          'Total hours (35) below required minimum (40)',
          'Missing time entries for required days',
        ],
        warnings: [],
      };

      mockService.validate.mockResolvedValue(expected);

      // Act
      const result = await controller.validate(TEST_TENANT_ID, 'timesheet-123');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
});
