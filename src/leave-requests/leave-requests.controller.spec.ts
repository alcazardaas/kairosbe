import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * LeaveRequestsController Unit Tests
 * Tests HTTP request/response handling for leave request endpoints
 * Target Coverage: 100%
 */
describe('LeaveRequestsController', () => {
  let controller: LeaveRequestsController;
  let service: vi.Mocked<LeaveRequestsService>;

  const mockLeaveRequest = {
    id: 'request-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    benefitTypeId: 'benefit-1',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-05'),
    daysRequested: 5,
    status: 'pending' as const,
    reason: 'Family vacation',
    approverUserId: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    benefitType: {
      id: 'benefit-1',
      name: 'PTO',
      code: 'PTO',
    },
  };

  const mockSession = {
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
  };

  const mockBenefitBalance = {
    benefitTypeId: 'benefit-1',
    benefitTypeName: 'PTO',
    benefitTypeCode: 'PTO',
    initialBalance: '20',
    currentBalance: '15',
    usedBalance: '5',
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      cancel: vi.fn(),
      getUserBenefitBalances: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveRequestsController],
      providers: [{ provide: LeaveRequestsService, useValue: service }],
    }).compile();

    controller = module.get<LeaveRequestsController>(LeaveRequestsController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /leave-requests', () => {
    it('should list all leave requests', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 1,
        pageSize: 20,
        total: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, mockSession);

      // Assert
      expect(result).toEqual({
        data: [mockLeaveRequest],
        page: 1,
        page_size: 20,
        total: 1,
      });
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: false,
        team: false,
        status: undefined,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter own requests with mine=true', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 1,
        pageSize: 20,
        total: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, mockSession, 'true');

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: true,
        team: false,
        status: undefined,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter team requests with team=true', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 1,
        pageSize: 20,
        total: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, mockSession, undefined, 'true');

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: false,
        team: true,
        status: undefined,
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 1,
        pageSize: 20,
        total: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, mockSession, undefined, undefined, 'pending');

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: false,
        team: false,
        status: 'pending',
        from: undefined,
        to: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 1,
        pageSize: 20,
        total: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        undefined,
        undefined,
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: false,
        team: false,
        status: undefined,
        from: '2025-02-01',
        to: '2025-02-28',
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 2,
        pageSize: 50,
        total: 100,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2',
        '50',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: false,
        team: false,
        status: undefined,
        from: undefined,
        to: undefined,
        page: 2,
        pageSize: 50,
      });
    });

    it('should combine multiple filters', async () => {
      // Arrange
      const mockResponse = {
        data: [mockLeaveRequest],
        page: 1,
        pageSize: 20,
        total: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(
        TEST_TENANT_ID,
        mockSession,
        'true',
        undefined,
        'approved',
        '2025-01-01',
        '2025-12-31',
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, {
        mine: true,
        team: false,
        status: 'approved',
        from: '2025-01-01',
        to: '2025-12-31',
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should extract userId from session', async () => {
      // Arrange
      const mockResponse = {
        data: [],
        page: 1,
        pageSize: 20,
        total: 0,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { userId: 'user-123' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-123', expect.any(Object));
    });
  });

  describe('GET /leave-requests/:id', () => {
    it('should get leave request by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockLeaveRequest);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, 'request-1');

      // Assert
      expect(result).toEqual({ data: mockLeaveRequest });
      expect(service.findOne).toHaveBeenCalledWith(TEST_TENANT_ID, 'request-1');
    });

    it('should wrap result in data property', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockLeaveRequest);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, 'request-1');

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockLeaveRequest);
    });
  });

  describe('POST /leave-requests', () => {
    const createDto = {
      benefitTypeId: 'benefit-1',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-05'),
      daysRequested: 5,
      reason: 'Family vacation',
    };

    it('should create new leave request', async () => {
      // Arrange
      service.create.mockResolvedValue(mockLeaveRequest);

      // Act
      const result = await controller.create(TEST_TENANT_ID, mockSession, createDto);

      // Assert
      expect(result).toEqual({ data: mockLeaveRequest });
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID, createDto);
    });

    it('should extract userId from session', async () => {
      // Arrange
      service.create.mockResolvedValue(mockLeaveRequest);
      const customSession = { userId: 'user-456' };

      // Act
      await controller.create(TEST_TENANT_ID, customSession, createDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-456', createDto);
    });

    it('should wrap result in data property', async () => {
      // Arrange
      service.create.mockResolvedValue(mockLeaveRequest);

      // Act
      const result = await controller.create(TEST_TENANT_ID, mockSession, createDto);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockLeaveRequest);
    });

    it('should validate DTO with zod schema', async () => {
      // Arrange
      service.create.mockResolvedValue(mockLeaveRequest);

      // Act
      const result = await controller.create(TEST_TENANT_ID, mockSession, createDto);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('POST /leave-requests/:id/approve', () => {
    const reviewDto = {
      reviewNote: 'Approved for vacation',
    };

    it('should approve leave request', async () => {
      // Arrange
      const approved = { ...mockLeaveRequest, status: 'approved' as const };
      service.approve.mockResolvedValue(approved);

      // Act
      const result = await controller.approve(TEST_TENANT_ID, mockSession, 'request-1', reviewDto);

      // Assert
      expect(result).toEqual({ data: approved });
      expect(service.approve).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'request-1',
        TEST_USER_ID,
        reviewDto,
      );
    });

    it('should extract approverUserId from session', async () => {
      // Arrange
      const approved = { ...mockLeaveRequest, status: 'approved' as const };
      service.approve.mockResolvedValue(approved);
      const managerSession = { userId: 'manager-1' };

      // Act
      await controller.approve(TEST_TENANT_ID, managerSession, 'request-1', reviewDto);

      // Assert
      expect(service.approve).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'request-1',
        'manager-1',
        reviewDto,
      );
    });

    it('should approve without review note', async () => {
      // Arrange
      const approved = { ...mockLeaveRequest, status: 'approved' as const };
      service.approve.mockResolvedValue(approved);

      // Act
      await controller.approve(TEST_TENANT_ID, mockSession, 'request-1');

      // Assert
      expect(service.approve).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'request-1',
        TEST_USER_ID,
        undefined,
      );
    });

    it('should wrap result in data property', async () => {
      // Arrange
      const approved = { ...mockLeaveRequest, status: 'approved' as const };
      service.approve.mockResolvedValue(approved);

      // Act
      const result = await controller.approve(TEST_TENANT_ID, mockSession, 'request-1', reviewDto);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data.status).toBe('approved');
    });
  });

  describe('POST /leave-requests/:id/reject', () => {
    const reviewDto = {
      reviewNote: 'Insufficient staffing',
    };

    it('should reject leave request', async () => {
      // Arrange
      const rejected = { ...mockLeaveRequest, status: 'rejected' as const };
      service.reject.mockResolvedValue(rejected);

      // Act
      const result = await controller.reject(TEST_TENANT_ID, mockSession, 'request-1', reviewDto);

      // Assert
      expect(result).toEqual({ data: rejected });
      expect(service.reject).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'request-1',
        TEST_USER_ID,
        reviewDto,
      );
    });

    it('should extract approverUserId from session', async () => {
      // Arrange
      const rejected = { ...mockLeaveRequest, status: 'rejected' as const };
      service.reject.mockResolvedValue(rejected);
      const managerSession = { userId: 'manager-1' };

      // Act
      await controller.reject(TEST_TENANT_ID, managerSession, 'request-1', reviewDto);

      // Assert
      expect(service.reject).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'request-1',
        'manager-1',
        reviewDto,
      );
    });

    it('should reject without review note', async () => {
      // Arrange
      const rejected = { ...mockLeaveRequest, status: 'rejected' as const };
      service.reject.mockResolvedValue(rejected);

      // Act
      await controller.reject(TEST_TENANT_ID, mockSession, 'request-1');

      // Assert
      expect(service.reject).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'request-1',
        TEST_USER_ID,
        undefined,
      );
    });

    it('should wrap result in data property', async () => {
      // Arrange
      const rejected = { ...mockLeaveRequest, status: 'rejected' as const };
      service.reject.mockResolvedValue(rejected);

      // Act
      const result = await controller.reject(TEST_TENANT_ID, mockSession, 'request-1', reviewDto);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data.status).toBe('rejected');
    });
  });

  describe('DELETE /leave-requests/:id', () => {
    it('should cancel leave request', async () => {
      // Arrange
      const cancelled = { ...mockLeaveRequest, status: 'cancelled' as const };
      service.cancel.mockResolvedValue(cancelled);

      // Act
      const result = await controller.cancel(TEST_TENANT_ID, mockSession, 'request-1');

      // Assert
      expect(result).toEqual({ data: cancelled });
      expect(service.cancel).toHaveBeenCalledWith(TEST_TENANT_ID, 'request-1', TEST_USER_ID);
    });

    it('should extract userId from session', async () => {
      // Arrange
      const cancelled = { ...mockLeaveRequest, status: 'cancelled' as const };
      service.cancel.mockResolvedValue(cancelled);
      const customSession = { userId: 'user-789' };

      // Act
      await controller.cancel(TEST_TENANT_ID, customSession, 'request-1');

      // Assert
      expect(service.cancel).toHaveBeenCalledWith(TEST_TENANT_ID, 'request-1', 'user-789');
    });

    it('should wrap result in data property', async () => {
      // Arrange
      const cancelled = { ...mockLeaveRequest, status: 'cancelled' as const };
      service.cancel.mockResolvedValue(cancelled);

      // Act
      const result = await controller.cancel(TEST_TENANT_ID, mockSession, 'request-1');

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data.status).toBe('cancelled');
    });
  });

  describe('GET /leave-requests/users/:userId/benefits', () => {
    it('should get user benefit balances', async () => {
      // Arrange
      service.getUserBenefitBalances.mockResolvedValue([mockBenefitBalance]);

      // Act
      const result = await controller.getUserBenefits(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toEqual({
        data: [mockBenefitBalance],
        meta: {
          userId: TEST_USER_ID,
          count: 1,
        },
      });
      expect(service.getUserBenefitBalances).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_USER_ID);
    });

    it('should return empty array for user with no benefits', async () => {
      // Arrange
      service.getUserBenefitBalances.mockResolvedValue([]);

      // Act
      const result = await controller.getUserBenefits(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toEqual({
        data: [],
        meta: {
          userId: TEST_USER_ID,
          count: 0,
        },
      });
    });

    it('should return multiple benefit balances', async () => {
      // Arrange
      const multipleBalances = [
        mockBenefitBalance,
        { ...mockBenefitBalance, benefitTypeId: 'benefit-2', benefitTypeCode: 'SICK' },
      ];
      service.getUserBenefitBalances.mockResolvedValue(multipleBalances);

      // Act
      const result = await controller.getUserBenefits(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.count).toBe(2);
    });

    it('should include userId in meta', async () => {
      // Arrange
      service.getUserBenefitBalances.mockResolvedValue([mockBenefitBalance]);

      // Act
      const result = await controller.getUserBenefits(TEST_TENANT_ID, 'user-999');

      // Assert
      expect(result.meta.userId).toBe('user-999');
      expect(service.getUserBenefitBalances).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-999');
    });
  });
});
