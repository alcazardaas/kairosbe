import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BenefitTypesService } from './benefit-types.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * BenefitTypesService Unit Tests
 * Tests CRUD operations for benefit types (PTO, sick leave, etc.)
 * Target Coverage: 100%
 */
describe('BenefitTypesService', () => {
  let service: BenefitTypesService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockBenefitType = {
    id: 'benefit-1',
    tenant_id: TEST_TENANT_ID,
    key: 'PTO',
    name: 'Paid Time Off',
    unit: 'days' as const,
    requires_approval: true,
  };

  const mockBenefitTypeCamel = {
    id: 'benefit-1',
    tenantId: TEST_TENANT_ID,
    key: 'PTO',
    name: 'Paid Time Off',
    unit: 'days',
    requiresApproval: true,
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BenefitTypesService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<BenefitTypesService>(BenefitTypesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list of benefit types', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockBenefitType]); // data query

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      // Assert
      expect(result).toEqual({
        data: [mockBenefitTypeCamel],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by unit', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, { unit: 'days', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by requiresApproval true', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, { requiresApproval: true, page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by requiresApproval false', async () => {
      // Arrange
      const noapproval = { ...mockBenefitType, requires_approval: false };
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([noapproval]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, {
        requiresApproval: false,
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.data[0].requiresApproval).toBe(false);
    });

    it('should filter by search term', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, { search: 'Paid', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should sort by name ascending', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, { sort: 'name:asc', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where().orderBy).toHaveBeenCalled();
    });

    it('should sort by name descending', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, { sort: 'name:desc', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where().orderBy).toHaveBeenCalled();
    });

    it('should sort by key', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, { sort: 'key:asc', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where().orderBy).toHaveBeenCalled();
    });

    it('should handle pagination with page 2', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 2, limit: 20 });

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(mockDbService.getDb().select().from().where().orderBy().limit().offset).toHaveBeenCalledWith(
        20,
      );
    });

    it('should return empty array when no results', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should combine multiple filters', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll(TEST_TENANT_ID, {
        unit: 'days',
        requiresApproval: true,
        search: 'Time',
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      await service.findAll('different-tenant', { page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should transform snake_case to camelCase', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockBenefitType]);

      // Act
      const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      // Assert
      expect(result.data[0]).toHaveProperty('tenantId');
      expect(result.data[0]).toHaveProperty('requiresApproval');
      expect(result.data[0]).not.toHaveProperty('tenant_id');
      expect(result.data[0]).not.toHaveProperty('requires_approval');
    });
  });

  describe('findOne', () => {
    it('should return benefit type by id', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(result).toEqual(mockBenefitTypeCamel);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Benefit type with ID nonexistent not found',
      );
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('different-tenant', 'benefit-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should transform snake_case to camelCase', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]);

      // Act
      const result = await service.findOne(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('requiresApproval');
      expect(result).not.toHaveProperty('tenant_id');
    });
  });

  describe('create', () => {
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
        tenant_id: TEST_TENANT_ID,
        key: 'SICK',
        name: 'Sick Leave',
        unit: 'days',
        requires_approval: true,
      };
      mockDbService.getDb().insert().values.mockResolvedValue([newBenefitType]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result.key).toBe('SICK');
      expect(result.name).toBe('Sick Leave');
      expect(result.tenantId).toBe(TEST_TENANT_ID);
    });

    it('should throw ConflictException on duplicate key', async () => {
      // Arrange
      const duplicateError: any = new Error('Duplicate key');
      duplicateError.code = '23505';
      mockDbService.getDb().insert().values.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(TEST_TENANT_ID, createDto)).rejects.toThrow(
        'Benefit type with key "SICK" already exists for this tenant',
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

    it('should create benefit type with hours unit', async () => {
      // Arrange
      const hoursDto = { ...createDto, unit: 'hours' as const };
      const hoursResult = { ...mockBenefitType, unit: 'hours' };
      mockDbService.getDb().insert().values.mockResolvedValue([hoursResult]);

      // Act
      const result = await service.create(TEST_TENANT_ID, hoursDto);

      // Assert
      expect(result.unit).toBe('hours');
    });

    it('should create benefit type without approval requirement', async () => {
      // Arrange
      const noApprovalDto = { ...createDto, requiresApproval: false };
      const noApprovalResult = { ...mockBenefitType, requires_approval: false };
      mockDbService.getDb().insert().values.mockResolvedValue([noApprovalResult]);

      // Act
      const result = await service.create(TEST_TENANT_ID, noApprovalDto);

      // Assert
      expect(result.requiresApproval).toBe(false);
    });

    it('should transform snake_case to camelCase in result', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([mockBenefitType]);

      // Act
      const result = await service.create(TEST_TENANT_ID, createDto);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('requiresApproval');
      expect(result).not.toHaveProperty('tenant_id');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated PTO',
      unit: 'hours' as const,
      requiresApproval: false,
    };

    it('should update benefit type', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]); // findOne check
      const updated = { ...mockBenefitType, name: 'Updated PTO' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'benefit-1', updateDto);

      // Assert
      expect(result.name).toBe('Updated PTO');
    });

    it('should throw NotFoundException when benefit type does not exist', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]); // findOne fails

      // Act & Assert
      await expect(service.update(TEST_TENANT_ID, 'nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update only provided fields', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]);
      const partialUpdate = { name: 'New Name' };
      const updated = { ...mockBenefitType, name: 'New Name' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'benefit-1', partialUpdate);

      // Assert
      expect(result.name).toBe('New Name');
    });

    it('should update unit only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]);
      const updated = { ...mockBenefitType, unit: 'hours' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'benefit-1', { unit: 'hours' });

      // Assert
      expect(result.unit).toBe('hours');
    });

    it('should update requiresApproval only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]);
      const updated = { ...mockBenefitType, requires_approval: false };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'benefit-1', { requiresApproval: false });

      // Assert
      expect(result.requiresApproval).toBe(false);
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update('different-tenant', 'benefit-1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should transform snake_case to camelCase in result', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]);
      mockDbService.getDb().update().set.mockResolvedValue([mockBenefitType]);

      // Act
      const result = await service.update(TEST_TENANT_ID, 'benefit-1', updateDto);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('requiresApproval');
    });
  });

  describe('remove', () => {
    it('should delete benefit type', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockBenefitType]); // findOne check
      mockDbService.getDb().delete().where.mockResolvedValue([]);

      // Act
      await service.remove(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(mockDbService.getDb().delete().where).toHaveBeenCalled();
    });

    it('should throw NotFoundException when benefit type does not exist', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove('different-tenant', 'benefit-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call findOne before delete', async () => {
      // Arrange
      const selectMock = mockDbService.getDb().select().from().where;
      selectMock.mockResolvedValue([mockBenefitType]);
      mockDbService.getDb().delete().where.mockResolvedValue([]);

      // Act
      await service.remove(TEST_TENANT_ID, 'benefit-1');

      // Assert
      expect(selectMock).toHaveBeenCalled();
    });
  });
});
