import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetPoliciesController } from './timesheet-policies.controller';
import { TimesheetPoliciesService } from './timesheet-policies.service';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * TimesheetPoliciesController Unit Tests
 * Tests HTTP request/response handling for timesheet policy endpoints
 * Target Coverage: 100%
 */
describe('TimesheetPoliciesController', () => {
  let controller: TimesheetPoliciesController;
  let service: vi.Mocked<TimesheetPoliciesService>;

  const mockPolicy = {
    tenantId: TEST_TENANT_ID,
    weekStart: 1,
    maxHoursPerDay: '8',
    allowOvertime: false,
    lockAfterApproval: true,
  };

  beforeEach(async () => {
    service = {
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimesheetPoliciesController],
      providers: [{ provide: TimesheetPoliciesService, useValue: service }],
    }).compile();

    controller = module.get<TimesheetPoliciesController>(TimesheetPoliciesController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /timesheet-policies', () => {
    it('should return policy for current tenant', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockPolicy);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID);

      // Assert
      expect(result).toEqual(mockPolicy);
      expect(service.findOne).toHaveBeenCalledWith(TEST_TENANT_ID);
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockPolicy);

      // Act
      await controller.findOne('tenant-123');

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('tenant-123');
    });

    it('should return policy configuration', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockPolicy);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID);

      // Assert
      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('maxHoursPerDay');
      expect(result).toHaveProperty('allowOvertime');
      expect(result).toHaveProperty('lockAfterApproval');
    });
  });

  describe('POST /timesheet-policies', () => {
    const createDto = {
      weekStart: 0,
      maxHoursPerDay: 10,
      allowOvertime: true,
      lockAfterApproval: false,
    };

    it('should create new policy', async () => {
      // Arrange
      const newPolicy = {
        tenantId: TEST_TENANT_ID,
        weekStart: 0,
        maxHoursPerDay: '10',
        allowOvertime: true,
        lockAfterApproval: false,
      };
      service.create.mockResolvedValue(newPolicy);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toEqual(newPolicy);
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto);
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.create.mockResolvedValue(mockPolicy);

      // Act
      await controller.create('tenant-456', createDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith('tenant-456', createDto);
    });

    it('should create policy with week starting on Sunday', async () => {
      // Arrange
      const sundayPolicy = { ...mockPolicy, weekStart: 0 };
      service.create.mockResolvedValue(sundayPolicy);

      // Act
      const result = await controller.create(TEST_TENANT_ID, { ...createDto, weekStart: 0 });

      // Assert
      expect(result.weekStart).toBe(0);
    });

    it('should create policy with week starting on Monday', async () => {
      // Arrange
      const mondayPolicy = { ...mockPolicy, weekStart: 1 };
      service.create.mockResolvedValue(mondayPolicy);

      // Act
      const result = await controller.create(TEST_TENANT_ID, { ...createDto, weekStart: 1 });

      // Assert
      expect(result.weekStart).toBe(1);
    });

    it('should create policy allowing overtime', async () => {
      // Arrange
      const overtimePolicy = { ...mockPolicy, allowOvertime: true };
      service.create.mockResolvedValue(overtimePolicy);

      // Act
      const result = await controller.create(TEST_TENANT_ID, { ...createDto, allowOvertime: true });

      // Assert
      expect(result.allowOvertime).toBe(true);
    });

    it('should create policy with no lock after approval', async () => {
      // Arrange
      const noLockPolicy = { ...mockPolicy, lockAfterApproval: false };
      service.create.mockResolvedValue(noLockPolicy);

      // Act
      const result = await controller.create(TEST_TENANT_ID, {
        ...createDto,
        lockAfterApproval: false,
      });

      // Assert
      expect(result.lockAfterApproval).toBe(false);
    });

    it('should create policy with max hours limit', async () => {
      // Arrange
      const limitPolicy = { ...mockPolicy, maxHoursPerDay: '10' };
      service.create.mockResolvedValue(limitPolicy);

      // Act
      const result = await controller.create(TEST_TENANT_ID, { ...createDto, maxHoursPerDay: 10 });

      // Assert
      expect(result.maxHoursPerDay).toBe('10');
    });
  });

  describe('PATCH /timesheet-policies', () => {
    const updateDto = {
      weekStart: 0,
      maxHoursPerDay: 12,
      allowOvertime: true,
      lockAfterApproval: false,
    };

    it('should update policy', async () => {
      // Arrange
      const updated = { ...mockPolicy, weekStart: 0 };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(TEST_TENANT_ID, updateDto);
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.update.mockResolvedValue(mockPolicy);

      // Act
      await controller.update('tenant-789', updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith('tenant-789', updateDto);
    });

    it('should update only weekStart', async () => {
      // Arrange
      const updated = { ...mockPolicy, weekStart: 0 };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, { weekStart: 0 });

      // Assert
      expect(result.weekStart).toBe(0);
    });

    it('should update only maxHoursPerDay', async () => {
      // Arrange
      const updated = { ...mockPolicy, maxHoursPerDay: '12' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, { maxHoursPerDay: 12 });

      // Assert
      expect(result.maxHoursPerDay).toBe('12');
    });

    it('should update only allowOvertime', async () => {
      // Arrange
      const updated = { ...mockPolicy, allowOvertime: true };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, { allowOvertime: true });

      // Assert
      expect(result.allowOvertime).toBe(true);
    });

    it('should update only lockAfterApproval', async () => {
      // Arrange
      const updated = { ...mockPolicy, lockAfterApproval: false };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, { lockAfterApproval: false });

      // Assert
      expect(result.lockAfterApproval).toBe(false);
    });

    it('should update multiple fields', async () => {
      // Arrange
      const updated = {
        ...mockPolicy,
        weekStart: 0,
        maxHoursPerDay: '12',
        allowOvertime: true,
      };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, {
        weekStart: 0,
        maxHoursPerDay: 12,
        allowOvertime: true,
      });

      // Assert
      expect(result.weekStart).toBe(0);
      expect(result.maxHoursPerDay).toBe('12');
      expect(result.allowOvertime).toBe(true);
    });
  });

  describe('DELETE /timesheet-policies', () => {
    it('should delete policy', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(TEST_TENANT_ID);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(TEST_TENANT_ID);
    });

    it('should return void (204 No Content)', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(TEST_TENANT_ID);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('tenant-999');

      // Assert
      expect(service.remove).toHaveBeenCalledWith('tenant-999');
    });
  });
});
