import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TimesheetPoliciesService } from './timesheet-policies.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * TimesheetPoliciesService Unit Tests
 * Tests CRUD operations for tenant timesheet policy configuration
 * Target Coverage: 100%
 */
describe('TimesheetPoliciesService', () => {
  let service: TimesheetPoliciesService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockPolicy = {
    tenant_id: TEST_TENANT_ID,
    week_start: 1, // Monday
    max_hours_per_day: '8',
    allow_overtime: false,
    lock_after_approval: true,
  };

  const mockPolicyCamel = {
    tenantId: TEST_TENANT_ID,
    weekStart: 1,
    maxHoursPerDay: '8',
    allowOvertime: false,
    lockAfterApproval: true,
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimesheetPoliciesService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<TimesheetPoliciesService>(TimesheetPoliciesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all timesheet policies', async () => {
      // Arrange
      const policies = [mockPolicy, { ...mockPolicy, tenant_id: 'tenant-2' }];
      mockDbService.getDb().select().from.mockResolvedValue(policies);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('tenantId');
      expect(result[1]).toHaveProperty('tenantId');
    });

    it('should return empty array when no policies', async () => {
      // Arrange
      mockDbService.getDb().select().from.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should transform snake_case to camelCase', async () => {
      // Arrange
      mockDbService.getDb().select().from.mockResolvedValue([mockPolicy]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result[0]).toHaveProperty('tenantId');
      expect(result[0]).toHaveProperty('weekStart');
      expect(result[0]).toHaveProperty('maxHoursPerDay');
      expect(result[0]).toHaveProperty('allowOvertime');
      expect(result[0]).toHaveProperty('lockAfterApproval');
      expect(result[0]).not.toHaveProperty('tenant_id');
    });
  });

  describe('findOne', () => {
    it('should return policy by tenantId', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID);

      // Assert
      expect(result).toEqual(mockPolicyCamel);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Timesheet policy for tenant nonexistent not found',
      );
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('different-tenant')).rejects.toThrow(NotFoundException);
    });

    it('should transform snake_case to camelCase', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('maxHoursPerDay');
      expect(result).not.toHaveProperty('tenant_id');
    });
  });

  describe('create', () => {
    const createDto = {
      weekStart: 0, // Sunday
      maxHoursPerDay: 10,
      allowOvertime: true,
      lockAfterApproval: false,
    };

    it('should create new policy', async () => {
      // Arrange
      const newPolicy = {
        tenant_id: TEST_TENANT_ID,
        week_start: 0,
        max_hours_per_day: '10',
        allow_overtime: true,
        lock_after_approval: false,
      };
      mockDbService.getDb().insert().values.mockResolvedValue([newPolicy]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.tenantId).toBe(TEST_TENANT_ID);
      expect(result.weekStart).toBe(0);
      expect(result.maxHoursPerDay).toBe('10');
      expect(result.allowOvertime).toBe(true);
      expect(result.lockAfterApproval).toBe(false);
    });

    it('should throw ConflictException on duplicate tenant', async () => {
      // Arrange
      const duplicateError: any = new Error('Duplicate key');
      duplicateError.code = '23505';
      mockDbService.getDb().insert().values.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(
        `Timesheet policy for tenant ${TEST_TENANT_ID} already exists`,
      );
    });

    it('should rethrow other database errors', async () => {
      // Arrange
      const genericError = new Error('Database connection failed');
      mockDbService.getDb().insert().values.mockRejectedValue(genericError);

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should create policy with week starting on Monday', async () => {
      // Arrange
      const mondayDto = { ...createDto, weekStart: 1 };
      const mondayPolicy = { ...mockPolicy, week_start: 1 };
      mockDbService.getDb().insert().values.mockResolvedValue([mondayPolicy]);

      // Act
      const result = await service.create(TEST_TENANT_ID, mondayDto);

      // Assert
      expect(result.weekStart).toBe(1);
    });

    it('should create policy with no max hours limit', async () => {
      // Arrange
      const noLimitDto = { ...createDto, maxHoursPerDay: undefined };
      const noLimitPolicy = { ...mockPolicy, max_hours_per_day: null };
      mockDbService.getDb().insert().values.mockResolvedValue([noLimitPolicy]);

      // Act
      const result = await service.create(TEST_TENANT_ID, noLimitDto);

      // Assert
      expect(result.maxHoursPerDay).toBeNull();
    });

    it('should create policy allowing overtime', async () => {
      // Arrange
      const overtimeDto = { ...createDto, allowOvertime: true };
      const overtimePolicy = { ...mockPolicy, allow_overtime: true };
      mockDbService.getDb().insert().values.mockResolvedValue([overtimePolicy]);

      // Act
      const result = await service.create(TEST_TENANT_ID, overtimeDto);

      // Assert
      expect(result.allowOvertime).toBe(true);
    });

    it('should create policy without locking after approval', async () => {
      // Arrange
      const noLockDto = { ...createDto, lockAfterApproval: false };
      const noLockPolicy = { ...mockPolicy, lock_after_approval: false };
      mockDbService.getDb().insert().values.mockResolvedValue([noLockPolicy]);

      // Act
      const result = await service.create(TEST_TENANT_ID, noLockDto);

      // Assert
      expect(result.lockAfterApproval).toBe(false);
    });

    it('should convert maxHoursPerDay number to string', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([mockPolicy]);

      // Act
      await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(mockDbService.getDb().insert().values).toHaveBeenCalled();
      const callArg = mockDbService.getDb().insert().values.mock.calls[0][0];
      expect(typeof callArg.maxHoursPerDay).toBe('string');
    });

    it('should transform snake_case to camelCase in result', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([mockPolicy]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('maxHoursPerDay');
      expect(result).not.toHaveProperty('tenant_id');
    });
  });

  describe('update', () => {
    const updateDto = {
      weekStart: 0,
      maxHoursPerDay: 12,
      allowOvertime: true,
      lockAfterApproval: false,
    };

    it('should update policy', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]); // findOne
      const updated = { ...mockPolicy, week_start: 0 };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result.weekStart).toBe(0);
    });

    it('should throw NotFoundException when policy does not exist', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      const updated = { ...mockPolicy, week_start: 0 };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, { weekStart: 0 });

      // Assert
      expect(result.weekStart).toBe(0);
    });

    it('should update weekStart only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      const updated = { ...mockPolicy, week_start: 6 };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, { weekStart: 6 });

      // Assert
      expect(result.weekStart).toBe(6);
    });

    it('should update maxHoursPerDay only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      const updated = { ...mockPolicy, max_hours_per_day: '12' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, { maxHoursPerDay: 12 });

      // Assert
      expect(result.maxHoursPerDay).toBe('12');
    });

    it('should update allowOvertime only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      const updated = { ...mockPolicy, allow_overtime: true };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, { allowOvertime: true });

      // Assert
      expect(result.allowOvertime).toBe(true);
    });

    it('should update lockAfterApproval only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      const updated = { ...mockPolicy, lock_after_approval: false };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, { lockAfterApproval: false });

      // Assert
      expect(result.lockAfterApproval).toBe(false);
    });

    it('should set maxHoursPerDay to null', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      const updated = { ...mockPolicy, max_hours_per_day: null };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, { maxHoursPerDay: null });

      // Assert
      expect(result.maxHoursPerDay).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update('different-tenant', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should transform snake_case to camelCase in result', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]);
      mockDbService.getDb().update().set.mockResolvedValue([mockPolicy]);

      // Act
      const result = await service.update(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('maxHoursPerDay');
    });
  });

  describe('remove', () => {
    it('should delete policy', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockPolicy]); // findOne
      mockDbService.getDb().delete().where.mockResolvedValue([]);

      // Act
      await service.remove(TEST_TENANT_ID);

      // Assert
      expect(mockDbService.getDb().delete().where).toHaveBeenCalled();
    });

    it('should throw NotFoundException when policy does not exist', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove('different-tenant')).rejects.toThrow(NotFoundException);
    });

    it('should call findOne before delete', async () => {
      // Arrange
      const selectMock = mockDbService.getDb().select().from().where;
      selectMock.mockResolvedValue([mockPolicy]);
      mockDbService.getDb().delete().where.mockResolvedValue([]);

      // Act
      await service.remove(TEST_TENANT_ID);

      // Assert
      expect(selectMock).toHaveBeenCalled();
    });
  });
});
