import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BenefitTypesController } from './benefit-types.controller';
import { BenefitTypesService } from './benefit-types.service';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * BenefitTypesController Unit Tests
 * Tests HTTP request/response handling for benefit type endpoints
 * Target Coverage: 100%
 */
describe('BenefitTypesController', () => {
  let controller: BenefitTypesController;
  let service: vi.Mocked<BenefitTypesService>;

  const mockBenefitType = {
    id: 'benefit-1',
    tenantId: TEST_TENANT_ID,
    key: 'PTO',
    name: 'Paid Time Off',
    unit: 'days',
    requiresApproval: true,
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BenefitTypesController],
      providers: [{ provide: BenefitTypesService, useValue: service }],
    }).compile();

    controller = module.get<BenefitTypesController>(BenefitTypesController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /benefit-types', () => {
    it('should return paginated benefit types', async () => {
      // Arrange
      const mockResponse = {
        data: [mockBenefitType],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, { page: 1, limit: 20 });
    });

    it('should pass query filters to service', async () => {
      // Arrange
      const mockResponse = {
        data: [mockBenefitType],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);
      const query = {
        page: 2,
        limit: 50,
        unit: 'days' as const,
        requiresApproval: true,
        search: 'PTO',
      };

      // Act
      await controller.findAll(TEST_TENANT_ID, query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, query);
    });

    it('should filter by unit', async () => {
      // Arrange
      const mockResponse = {
        data: [mockBenefitType],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, unit: 'days' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        unit: 'days',
      });
    });

    it('should filter by requiresApproval', async () => {
      // Arrange
      const mockResponse = {
        data: [mockBenefitType],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, requiresApproval: true });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        requiresApproval: true,
      });
    });

    it('should filter by search term', async () => {
      // Arrange
      const mockResponse = {
        data: [mockBenefitType],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, search: 'Paid' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'Paid',
      });
    });

    it('should handle sorting', async () => {
      // Arrange
      const mockResponse = {
        data: [mockBenefitType],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, sort: 'name:asc' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        sort: 'name:asc',
      });
    });

    it('should return empty array when no results', async () => {
      // Arrange
      const mockResponse = {
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('GET /benefit-types/:id', () => {
    it('should return benefit type by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockBenefitType);

      // Act
      const result = await controller.findOne(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(result).toEqual(mockBenefitType);
      expect(service.findOne).toHaveBeenCalledWith(TEST_TENANT_ID, 'benefit-1');
    });

    it('should pass tenant and id to service', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockBenefitType);

      // Act
      await controller.findOne('tenant-123', 'benefit-456');

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('tenant-123', 'benefit-456');
    });
  });

  describe('POST /benefit-types', () => {
    const createDto = {
      key: 'SICK',
      name: 'Sick Leave',
      unit: 'days' as const,
      requiresApproval: true,
    };

    it('should create new benefit type', async () => {
      // Arrange
      const newBenefitType = {
        id: 'benefit-2',
        tenantId: TEST_TENANT_ID,
        key: 'SICK',
        name: 'Sick Leave',
        unit: 'days',
        requiresApproval: true,
      };
      service.create.mockResolvedValue(newBenefitType);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toEqual(newBenefitType);
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto);
    });

    it('should create with hours unit', async () => {
      // Arrange
      const hoursDto = { ...createDto, unit: 'hours' as const };
      const hoursResult = { ...mockBenefitType, unit: 'hours' };
      service.create.mockResolvedValue(hoursResult);

      // Act
      const result = await controller.create(TEST_TENANT_ID, hoursDto);

      // Assert
      expect(result.unit).toBe('hours');
    });

    it('should create without approval requirement', async () => {
      // Arrange
      const noApprovalDto = { ...createDto, requiresApproval: false };
      const noApprovalResult = { ...mockBenefitType, requiresApproval: false };
      service.create.mockResolvedValue(noApprovalResult);

      // Act
      const result = await controller.create(TEST_TENANT_ID, noApprovalDto);

      // Assert
      expect(result.requiresApproval).toBe(false);
    });

    it('should return created benefit type', async () => {
      // Arrange
      service.create.mockResolvedValue(mockBenefitType);

      // Act
      const result = await controller.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('key');
    });
  });

  describe('PATCH /benefit-types/:id', () => {
    const updateDto = {
      name: 'Updated PTO',
      unit: 'hours' as const,
      requiresApproval: false,
    };

    it('should update benefit type', async () => {
      // Arrange
      const updated = { ...mockBenefitType, name: 'Updated PTO' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'benefit-1', updateDto);

      // Assert
      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(TEST_TENANT_ID, 'benefit-1', updateDto);
    });

    it('should update only name', async () => {
      // Arrange
      const updated = { ...mockBenefitType, name: 'New Name' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'benefit-1', { name: 'New Name' });

      // Assert
      expect(result.name).toBe('New Name');
    });

    it('should update only unit', async () => {
      // Arrange
      const updated = { ...mockBenefitType, unit: 'hours' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'benefit-1', { unit: 'hours' });

      // Assert
      expect(result.unit).toBe('hours');
    });

    it('should update only requiresApproval', async () => {
      // Arrange
      const updated = { ...mockBenefitType, requiresApproval: false };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'benefit-1', {
        requiresApproval: false,
      });

      // Assert
      expect(result.requiresApproval).toBe(false);
    });

    it('should pass tenant and id to service', async () => {
      // Arrange
      service.update.mockResolvedValue(mockBenefitType);

      // Act
      await controller.update('tenant-123', 'benefit-456', updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith('tenant-123', 'benefit-456', updateDto);
    });
  });

  describe('DELETE /benefit-types/:id', () => {
    it('should delete benefit type', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(service.remove).toHaveBeenCalledWith(TEST_TENANT_ID, 'benefit-1');
    });

    it('should return void (204 No Content)', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should pass tenant and id to service', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('tenant-123', 'benefit-456');

      // Assert
      expect(service.remove).toHaveBeenCalledWith('tenant-123', 'benefit-456');
    });
  });
});
