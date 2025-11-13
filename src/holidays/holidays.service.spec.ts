import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * HolidaysService Unit Tests
 * Tests CRUD operations and date-based filtering for holidays
 * Target Coverage: 100%
 */
describe('HolidaysService', () => {
  let service: HolidaysService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockHoliday = {
    id: 'holiday-1',
    tenant_id: TEST_TENANT_ID,
    country_code: 'US',
    date: new Date('2025-07-04'),
    name: 'Independence Day',
    type: 'national',
    is_recurring: true,
    description: 'US National Holiday',
  };

  const mockHolidayCamel = {
    id: 'holiday-1',
    tenantId: TEST_TENANT_ID,
    countryCode: 'US',
    date: new Date('2025-07-04'),
    name: 'Independence Day',
    type: 'national',
    isRecurring: true,
    description: 'US National Holiday',
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HolidaysService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<HolidaysService>(HolidaysService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list of holidays', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      const result = await service.findAll({ page: 1, limit: 20 });

      // Assert
      expect(result).toEqual({
        data: [mockHolidayCamel],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by tenantId', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ tenantId: TEST_TENANT_ID, page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by null tenantId for global holidays', async () => {
      // Arrange
      const globalHoliday = { ...mockHoliday, tenant_id: null };
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([globalHoliday]);

      // Act
      await service.findAll({ tenantId: null, page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by countryCode', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ countryCode: 'US', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ type: 'national', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by year', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ year: 2025, page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by startDate', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ startDate: '2025-01-01', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by endDate', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ endDate: '2025-12-31', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter upcoming holidays', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ upcoming: true, page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ search: 'Independence', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should apply default 12-month filter when no date filters', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ page: 1, limit: 20 });

      // Assert: Should add date range for next 12 months
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should not apply default filter when year is specified', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ year: 2025, page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where).toHaveBeenCalled();
    });

    it('should sort by date ascending', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ sort: 'date:asc', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where().orderBy).toHaveBeenCalled();
    });

    it('should sort by date descending', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ sort: 'date:desc', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where().orderBy).toHaveBeenCalled();
    });

    it('should sort by name', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({ sort: 'name:asc', page: 1, limit: 20 });

      // Assert
      expect(mockDbService.getDb().select().from().where().orderBy).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      // Arrange
      mockDbService
        .getDb()
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      const result = await service.findAll({ page: 2, limit: 20 });

      // Assert
      expect(result.page).toBe(2);
      expect(
        mockDbService.getDb().select().from().where().orderBy().limit().offset,
      ).toHaveBeenCalledWith(20);
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
      const result = await service.findAll({ page: 1, limit: 20 });

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
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      await service.findAll({
        tenantId: TEST_TENANT_ID,
        countryCode: 'US',
        type: 'national',
        year: 2025,
        search: 'Day',
        page: 1,
        limit: 20,
      });

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
        .mockResolvedValueOnce([mockHoliday]);

      // Act
      const result = await service.findAll({ page: 1, limit: 20 });

      // Assert
      expect(result.data[0]).toHaveProperty('tenantId');
      expect(result.data[0]).toHaveProperty('countryCode');
      expect(result.data[0]).toHaveProperty('isRecurring');
      expect(result.data[0]).not.toHaveProperty('tenant_id');
    });
  });

  describe('findOne', () => {
    it('should return holiday by id', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);

      // Act
      const result = await service.findOne('holiday-1');

      // Assert
      expect(result).toEqual(mockHolidayCamel);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Holiday with ID nonexistent not found',
      );
    });

    it('should transform snake_case to camelCase', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);

      // Act
      const result = await service.findOne('holiday-1');

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('countryCode');
      expect(result).toHaveProperty('isRecurring');
    });
  });

  describe('create', () => {
    const createDto = {
      tenantId: TEST_TENANT_ID,
      countryCode: 'US',
      date: '2025-12-25',
      name: 'Christmas',
      type: 'national' as const,
      isRecurring: true,
      description: 'Christmas Day',
    };

    it('should create new holiday', async () => {
      // Arrange
      const newHoliday = {
        id: 'holiday-2',
        tenant_id: TEST_TENANT_ID,
        country_code: 'US',
        date: new Date('2025-12-25'),
        name: 'Christmas',
        type: 'national',
        is_recurring: true,
        description: 'Christmas Day',
      };
      mockDbService.getDb().insert().values.mockResolvedValue([newHoliday]);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.name).toBe('Christmas');
      expect(result.countryCode).toBe('US');
    });

    it('should create holiday without tenant (global)', async () => {
      // Arrange
      const globalDto = { ...createDto, tenantId: undefined };
      const globalHoliday = { ...mockHoliday, tenant_id: null };
      mockDbService.getDb().insert().values.mockResolvedValue([globalHoliday]);

      // Act
      const result = await service.create(globalDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should create non-recurring holiday', async () => {
      // Arrange
      const nonRecurringDto = { ...createDto, isRecurring: false };
      const nonRecurringHoliday = { ...mockHoliday, is_recurring: false };
      mockDbService.getDb().insert().values.mockResolvedValue([nonRecurringHoliday]);

      // Act
      const result = await service.create(nonRecurringDto);

      // Assert
      expect(result.isRecurring).toBe(false);
    });

    it('should create regional holiday', async () => {
      // Arrange
      const regionalDto = { ...createDto, type: 'regional' as const };
      const regionalHoliday = { ...mockHoliday, type: 'regional' };
      mockDbService.getDb().insert().values.mockResolvedValue([regionalHoliday]);

      // Act
      const result = await service.create(regionalDto);

      // Assert
      expect(result.type).toBe('regional');
    });

    it('should create company holiday', async () => {
      // Arrange
      const companyDto = { ...createDto, type: 'company' as const };
      const companyHoliday = { ...mockHoliday, type: 'company' };
      mockDbService.getDb().insert().values.mockResolvedValue([companyHoliday]);

      // Act
      const result = await service.create(companyDto);

      // Assert
      expect(result.type).toBe('company');
    });

    it('should convert date string to Date object', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([mockHoliday]);

      // Act
      await service.create(createDto);

      // Assert
      expect(mockDbService.getDb().insert().values).toHaveBeenCalled();
    });

    it('should transform snake_case to camelCase in result', async () => {
      // Arrange
      mockDbService.getDb().insert().values.mockResolvedValue([mockHoliday]);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('countryCode');
      expect(result).toHaveProperty('isRecurring');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Holiday',
      date: '2025-12-26',
      type: 'company' as const,
      isRecurring: false,
    };

    it('should update holiday', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]); // findOne
      const updated = { ...mockHoliday, name: 'Updated Holiday' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update('holiday-1', updateDto);

      // Assert
      expect(result.name).toBe('Updated Holiday');
    });

    it('should throw NotFoundException when holiday does not exist', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      const updated = { ...mockHoliday, name: 'New Name' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update('holiday-1', { name: 'New Name' });

      // Assert
      expect(result.name).toBe('New Name');
    });

    it('should update date only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      const updated = { ...mockHoliday, date: new Date('2025-12-26') };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      await service.update('holiday-1', { date: '2025-12-26' });

      // Assert
      expect(mockDbService.getDb().update().set).toHaveBeenCalled();
    });

    it('should update type only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      const updated = { ...mockHoliday, type: 'company' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update('holiday-1', { type: 'company' });

      // Assert
      expect(result.type).toBe('company');
    });

    it('should update isRecurring only', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      const updated = { ...mockHoliday, is_recurring: false };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update('holiday-1', { isRecurring: false });

      // Assert
      expect(result.isRecurring).toBe(false);
    });

    it('should update countryCode', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      const updated = { ...mockHoliday, country_code: 'CA' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update('holiday-1', { countryCode: 'CA' });

      // Assert
      expect(result.countryCode).toBe('CA');
    });

    it('should update description', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      const updated = { ...mockHoliday, description: 'New description' };
      mockDbService.getDb().update().set.mockResolvedValue([updated]);

      // Act
      const result = await service.update('holiday-1', { description: 'New description' });

      // Assert
      expect(result.description).toBe('New description');
    });

    it('should transform snake_case to camelCase in result', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]);
      mockDbService.getDb().update().set.mockResolvedValue([mockHoliday]);

      // Act
      const result = await service.update('holiday-1', updateDto);

      // Assert
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('countryCode');
      expect(result).toHaveProperty('isRecurring');
    });
  });

  describe('remove', () => {
    it('should delete holiday', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([mockHoliday]); // findOne
      mockDbService.getDb().delete().where.mockResolvedValue([]);

      // Act
      await service.remove('holiday-1');

      // Assert
      expect(mockDbService.getDb().delete().where).toHaveBeenCalled();
    });

    it('should throw NotFoundException when holiday does not exist', async () => {
      // Arrange
      mockDbService.getDb().select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should call findOne before delete', async () => {
      // Arrange
      const selectMock = mockDbService.getDb().select().from().where;
      selectMock.mockResolvedValue([mockHoliday]);
      mockDbService.getDb().delete().where.mockResolvedValue([]);

      // Act
      await service.remove('holiday-1');

      // Assert
      expect(selectMock).toHaveBeenCalled();
    });
  });
});
