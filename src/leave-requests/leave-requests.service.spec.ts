import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * LeaveRequestsService Unit Tests
 * Tests leave request lifecycle and benefit balance management
 * Target Coverage: 100%
 */
describe('LeaveRequestsService', () => {
  let service: LeaveRequestsService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockLeaveRequest = {
    id: 'request-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    benefitTypeId: 'benefit-1',
    startDate: new Date('2025-01-10'),
    endDate: new Date('2025-01-12'),
    amount: '3',
    status: 'pending',
    approverUserId: null,
    approvedAt: null,
    note: 'Vacation',
    createdAt: new Date(),
  };

  const mockBenefitType = {
    id: 'benefit-1',
    tenantId: TEST_TENANT_ID,
    key: 'pto',
    name: 'Paid Time Off',
    unit: 'days',
    requiresApproval: true,
    allowNegativeBalance: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBenefitBalance = {
    id: 'balance-1',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    benefitTypeId: 'benefit-1',
    currentBalance: '10',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: TEST_USER_ID,
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LeaveRequestsService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<LeaveRequestsService>(LeaveRequestsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockCompleteRequest = {
      ...mockLeaveRequest,
      userName: mockUser.name,
      userEmail: mockUser.email,
      benefitType: {
        id: mockBenefitType.id,
        key: mockBenefitType.key,
        name: mockBenefitType.name,
        unit: mockBenefitType.unit,
      },
    };

    it('should return paginated leave requests', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockCompleteRequest]); // data query

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter own requests with mine=true', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockCompleteRequest]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, { mine: true });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter team requests with team=true', async () => {
      // Arrange
      const directReports = [{ userId: 'employee-1' }];
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce(directReports) // direct reports query
        .mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockCompleteRequest]); // data query

      // Act
      const result = await service.findAll(TEST_TENANT_ID, 'manager-1', { team: true });

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('should return empty when manager has no team', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]); // no direct reports

      // Act
      const result = await service.findAll(TEST_TENANT_ID, 'manager-1', { team: true });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by status', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockCompleteRequest]);

      // Act
      await service.findAll(TEST_TENANT_ID, TEST_USER_ID, { status: 'approved' });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([mockCompleteRequest]);

      // Act
      await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        from: '2025-01-01',
        to: '2025-12-31',
      });

      // Assert
      expect(mockDbService.db.select).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([{ count: 50 }]).mockResolvedValueOnce([mockCompleteRequest]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, TEST_USER_ID, {
        page: 2,
        pageSize: 10,
      });

      // Assert
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('findOne', () => {
    const mockCompleteRequest = {
      ...mockLeaveRequest,
      userName: mockUser.name,
      userEmail: mockUser.email,
      benefitType: {
        id: mockBenefitType.id,
        key: mockBenefitType.key,
        name: mockBenefitType.name,
        unit: mockBenefitType.unit,
      },
    };

    it('should return leave request by id', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockCompleteRequest]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'request-1');

      // Assert
      expect(result.id).toBe('request-1');
      expect(result.benefitType).toBeDefined();
    });

    it('should throw NotFoundException when request not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Leave request with ID nonexistent not found',
      );
    });
  });

  describe('create', () => {
    const createDto = {
      benefitTypeId: 'benefit-1',
      startDate: '2025-01-10',
      endDate: '2025-01-12',
      amount: 3,
      note: 'Vacation',
    };

    it('should create new leave request', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockBenefitType]) // benefit type exists
        .mockResolvedValueOnce([mockBenefitBalance]) // user has balance
        .mockResolvedValueOnce([{ ...mockLeaveRequest, benefitType: mockBenefitType }]); // findOne result

      mockDbService.db.insert().values.mockResolvedValue([mockLeaveRequest]);

      // Act
      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, createDto);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should throw BadRequestException for invalid benefit type', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]); // benefit type not found

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, TEST_USER_ID, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(TEST_TENANT_ID, TEST_USER_ID, createDto)).rejects.toThrow(
        'Invalid benefit type',
      );
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      // Arrange
      const lowBalance = { ...mockBenefitBalance, currentBalance: '2' }; // Less than requested 3
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockBenefitType])
        .mockResolvedValueOnce([lowBalance]);

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, TEST_USER_ID, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(TEST_TENANT_ID, TEST_USER_ID, createDto)).rejects.toThrow(
        'Insufficient balance',
      );
    });

    it('should allow negative balance if benefit type permits', async () => {
      // Arrange
      const flexibleBenefitType = { ...mockBenefitType, allowNegativeBalance: true };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([flexibleBenefitType])
        .mockResolvedValueOnce([{ ...mockLeaveRequest, benefitType: flexibleBenefitType }]);

      mockDbService.db.insert().values.mockResolvedValue([mockLeaveRequest]);

      // Act
      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        ...createDto,
        amount: 100, // More than balance
      });

      // Assert: Should not throw
      expect(result).toBeDefined();
    });

    it('should auto-create balance if not exists', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockBenefitType]) // benefit type exists
        .mockResolvedValueOnce([]) // balance not found
        .mockResolvedValueOnce([{ ...mockLeaveRequest, benefitType: mockBenefitType }]); // findOne result

      mockDbService.db.insert().values.mockResolvedValueOnce([{ ...mockBenefitBalance, currentBalance: '0' }]) // auto-create balance
        .mockResolvedValueOnce([mockLeaveRequest]); // create request

      // Act & Assert: Should throw insufficient balance
      await expect(service.create(TEST_TENANT_ID, TEST_USER_ID, createDto)).rejects.toThrow(
        'Insufficient balance',
      );
    });
  });

  describe('approve', () => {
    const mockCompleteRequest = {
      ...mockLeaveRequest,
      userName: mockUser.name,
      userEmail: mockUser.email,
      benefitType: {
        id: mockBenefitType.id,
        key: mockBenefitType.key,
        name: mockBenefitType.name,
        unit: mockBenefitType.unit,
      },
    };

    it('should approve pending request', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockCompleteRequest]) // findOne
        .mockResolvedValueOnce([mockBenefitType]) // get benefit type
        .mockResolvedValueOnce([mockBenefitBalance]); // get balance

      mockDbService.db.update().set().where.mockResolvedValueOnce([
        { ...mockLeaveRequest, status: 'approved' },
      ]) // update request
        .mockResolvedValueOnce([{ ...mockBenefitBalance, currentBalance: '7' }]); // update balance

      // Act
      const result = await service.approve(TEST_TENANT_ID, 'request-1', 'manager-1');

      // Assert
      expect(result.status).toBe('approved');
      expect(result.approverUserId).toBe('manager-1');
    });

    it('should throw BadRequestException for non-pending request', async () => {
      // Arrange
      const approvedRequest = { ...mockCompleteRequest, status: 'approved' };
      mockDbService.db.select().from().where.mockResolvedValue([approvedRequest]);

      // Act & Assert
      await expect(service.approve(TEST_TENANT_ID, 'request-1', 'manager-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve(TEST_TENANT_ID, 'request-1', 'manager-1')).rejects.toThrow(
        'Cannot approve request with status: approved',
      );
    });

    it('should deduct balance when approving', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockCompleteRequest])
        .mockResolvedValueOnce([mockBenefitType])
        .mockResolvedValueOnce([mockBenefitBalance]);

      mockDbService.db.update().set().where.mockResolvedValueOnce([mockLeaveRequest]).mockResolvedValueOnce([mockBenefitBalance]);

      // Act
      await service.approve(TEST_TENANT_ID, 'request-1', 'manager-1');

      // Assert: Balance update should be called
      expect(mockDbService.db.update).toHaveBeenCalled();
    });

    it('should include review note when approving', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([mockCompleteRequest])
        .mockResolvedValueOnce([mockBenefitType])
        .mockResolvedValueOnce([mockBenefitBalance]);

      mockDbService.db.update().set().where.mockResolvedValue([mockLeaveRequest]);

      // Act
      await service.approve(TEST_TENANT_ID, 'request-1', 'manager-1', {
        note: 'Approved with conditions',
      });

      // Assert
      expect(mockDbService.db.update).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    const mockCompleteRequest = {
      ...mockLeaveRequest,
      userName: mockUser.name,
      userEmail: mockUser.email,
      benefitType: mockBenefitType,
    };

    it('should reject pending request', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockCompleteRequest]);
      mockDbService.db.update().set().where.mockResolvedValue([
        { ...mockLeaveRequest, status: 'rejected' },
      ]);

      // Act
      const result = await service.reject(TEST_TENANT_ID, 'request-1', 'manager-1');

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.approverUserId).toBe('manager-1');
    });

    it('should throw BadRequestException for non-pending request', async () => {
      // Arrange
      const rejectedRequest = { ...mockCompleteRequest, status: 'rejected' };
      mockDbService.db.select().from().where.mockResolvedValue([rejectedRequest]);

      // Act & Assert
      await expect(service.reject(TEST_TENANT_ID, 'request-1', 'manager-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject(TEST_TENANT_ID, 'request-1', 'manager-1')).rejects.toThrow(
        'Cannot reject request with status: rejected',
      );
    });

    it('should not deduct balance when rejecting', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockCompleteRequest]);
      mockDbService.db.update().set().where.mockResolvedValue([mockLeaveRequest]);

      // Act
      await service.reject(TEST_TENANT_ID, 'request-1', 'manager-1');

      // Assert: Only one update (the request, not balance)
      expect(mockDbService.db.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    const mockCompleteRequest = {
      ...mockLeaveRequest,
      userName: mockUser.name,
      userEmail: mockUser.email,
      benefitType: mockBenefitType,
    };

    it('should cancel own pending request', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockCompleteRequest]);
      mockDbService.db.update().set().where.mockResolvedValue([
        { ...mockLeaveRequest, status: 'cancelled' },
      ]);

      // Act
      const result = await service.cancel(TEST_TENANT_ID, 'request-1', TEST_USER_ID);

      // Assert
      expect(result.status).toBe('cancelled');
    });

    it('should throw BadRequestException when cancelling others request', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockCompleteRequest]);

      // Act & Assert
      await expect(service.cancel(TEST_TENANT_ID, 'request-1', 'other-user')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(TEST_TENANT_ID, 'request-1', 'other-user')).rejects.toThrow(
        'You can only cancel your own requests',
      );
    });

    it('should throw BadRequestException for non-pending request', async () => {
      // Arrange
      const approvedRequest = { ...mockCompleteRequest, status: 'approved' };
      mockDbService.db.select().from().where.mockResolvedValue([approvedRequest]);

      // Act & Assert
      await expect(service.cancel(TEST_TENANT_ID, 'request-1', TEST_USER_ID)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(TEST_TENANT_ID, 'request-1', TEST_USER_ID)).rejects.toThrow(
        'Cannot cancel request with status: approved',
      );
    });
  });

  describe('getUserBenefitBalances', () => {
    const mockBalanceWithPolicy = {
      id: 'balance-1',
      benefitTypeId: 'benefit-1',
      benefitTypeKey: 'pto',
      benefitTypeName: 'Paid Time Off',
      currentBalance: '10',
      totalAmount: '20',
      unit: 'days',
      requiresApproval: true,
    };

    it('should return user benefit balances', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockBalanceWithPolicy]);

      // Act
      const result = await service.getUserBenefitBalances(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].benefitTypeKey).toBe('pto');
      expect(result[0].currentBalance).toBe('10');
      expect(result[0].usedAmount).toBe('10.00'); // totalAmount - currentBalance
    });

    it('should calculate used amount correctly', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockBalanceWithPolicy]);

      // Act
      const result = await service.getUserBenefitBalances(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result[0].usedAmount).toBe('10.00'); // 20 - 10 = 10
    });

    it('should return empty array for user with no balances', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.getUserBenefitBalances(TEST_TENANT_ID, TEST_USER_ID);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
