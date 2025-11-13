import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * HolidaysController Unit Tests
 * Tests HTTP request/response handling for holiday endpoints
 * Target Coverage: 100%
 */
describe('HolidaysController', () => {
  let controller: HolidaysController;
  let service: vi.Mocked<HolidaysService>;

  const mockHoliday = {
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
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HolidaysController],
      providers: [{ provide: HolidaysService, useValue: service }],
    }).compile();

    controller = module.get<HolidaysController>(HolidaysController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /holidays', () => {
    it('should return paginated holidays', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.findAll({ page: 1, limit: 20 });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should pass all query filters to service', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);
      const query = {
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
        countryCode: 'US',
        type: 'national' as const,
        year: 2025,
        search: 'Independence',
      };

      // Act
      await controller.findAll(query);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by tenantId', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, tenantId: TEST_TENANT_ID });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        tenantId: TEST_TENANT_ID,
      });
    });

    it('should filter by null tenantId for global holidays', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, tenantId: null });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, tenantId: null });
    });

    it('should filter by countryCode', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, countryCode: 'US' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, countryCode: 'US' });
    });

    it('should filter by year', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, year: 2025 });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, year: 2025 });
    });

    it('should filter by startDate and endDate', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({
        page: 1,
        limit: 20,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
    });

    it('should filter upcoming holidays', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, upcoming: true });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, upcoming: true });
    });

    it('should filter by type', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, type: 'national' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, type: 'national' });
    });

    it('should filter by search term', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, search: 'Independence' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'Independence' });
    });

    it('should handle sorting', async () => {
      // Arrange
      const mockResponse = {
        data: [mockHoliday],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll({ page: 1, limit: 20, sort: 'date:asc' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, sort: 'date:asc' });
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
      const result = await controller.findAll({ page: 1, limit: 20 });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('GET /holidays/:id', () => {
    it('should return holiday by id', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockHoliday);

      // Act
      const result = await controller.findOne('holiday-1');

      // Assert
      expect(result).toEqual(mockHoliday);
      expect(service.findOne).toHaveBeenCalledWith('holiday-1');
    });

    it('should pass id to service', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockHoliday);

      // Act
      await controller.findOne('holiday-456');

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('holiday-456');
    });
  });

  describe('POST /holidays', () => {
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
        tenantId: TEST_TENANT_ID,
        countryCode: 'US',
        date: new Date('2025-12-25'),
        name: 'Christmas',
        type: 'national',
        isRecurring: true,
        description: 'Christmas Day',
      };
      service.create.mockResolvedValue(newHoliday);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(newHoliday);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create global holiday without tenantId', async () => {
      // Arrange
      const globalDto = { ...createDto, tenantId: undefined };
      const globalHoliday = { ...mockHoliday, tenantId: null };
      service.create.mockResolvedValue(globalHoliday);

      // Act
      const result = await controller.create(globalDto);

      // Assert
      expect(result.tenantId).toBeNull();
    });

    it('should create non-recurring holiday', async () => {
      // Arrange
      const nonRecurringDto = { ...createDto, isRecurring: false };
      const nonRecurringHoliday = { ...mockHoliday, isRecurring: false };
      service.create.mockResolvedValue(nonRecurringHoliday);

      // Act
      const result = await controller.create(nonRecurringDto);

      // Assert
      expect(result.isRecurring).toBe(false);
    });

    it('should create regional holiday', async () => {
      // Arrange
      const regionalDto = { ...createDto, type: 'regional' as const };
      const regionalHoliday = { ...mockHoliday, type: 'regional' };
      service.create.mockResolvedValue(regionalHoliday);

      // Act
      const result = await controller.create(regionalDto);

      // Assert
      expect(result.type).toBe('regional');
    });

    it('should create company holiday', async () => {
      // Arrange
      const companyDto = { ...createDto, type: 'company' as const };
      const companyHoliday = { ...mockHoliday, type: 'company' };
      service.create.mockResolvedValue(companyHoliday);

      // Act
      const result = await controller.create(companyDto);

      // Assert
      expect(result.type).toBe('company');
    });
  });

  describe('PATCH /holidays/:id', () => {
    const updateDto = {
      name: 'Updated Holiday',
      date: '2025-12-26',
      type: 'company' as const,
      isRecurring: false,
    };

    it('should update holiday', async () => {
      // Arrange
      const updated = { ...mockHoliday, name: 'Updated Holiday' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update('holiday-1', updateDto);

      // Assert
      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('holiday-1', updateDto);
    });

    it('should update only name', async () => {
      // Arrange
      const updated = { ...mockHoliday, name: 'New Name' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update('holiday-1', { name: 'New Name' });

      // Assert
      expect(result.name).toBe('New Name');
    });

    it('should update only date', async () => {
      // Arrange
      const updated = { ...mockHoliday, date: new Date('2025-12-26') };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update('holiday-1', { date: '2025-12-26' });

      // Assert
      expect(result.date).toEqual(new Date('2025-12-26'));
    });

    it('should update only type', async () => {
      // Arrange
      const updated = { ...mockHoliday, type: 'company' };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update('holiday-1', { type: 'company' });

      // Assert
      expect(result.type).toBe('company');
    });

    it('should update only isRecurring', async () => {
      // Arrange
      const updated = { ...mockHoliday, isRecurring: false };
      service.update.mockResolvedValue(updated);

      // Act
      const result = await controller.update('holiday-1', { isRecurring: false });

      // Assert
      expect(result.isRecurring).toBe(false);
    });

    it('should pass id and update data to service', async () => {
      // Arrange
      service.update.mockResolvedValue(mockHoliday);

      // Act
      await controller.update('holiday-456', updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith('holiday-456', updateDto);
    });
  });

  describe('DELETE /holidays/:id', () => {
    it('should delete holiday', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('holiday-1');

      // Assert
      expect(service.remove).toHaveBeenCalledWith('holiday-1');
    });

    it('should return void (204 No Content)', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove('holiday-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should pass id to service', async () => {
      // Arrange
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('holiday-456');

      // Assert
      expect(service.remove).toHaveBeenCalledWith('holiday-456');
    });
  });
});
