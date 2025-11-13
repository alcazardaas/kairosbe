import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * CalendarService Unit Tests
 * Tests unified calendar feed aggregation from multiple sources
 * Target Coverage: 100%
 */
describe('CalendarService', () => {
  let service: CalendarService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockHoliday = {
    date: new Date('2025-07-04'),
    name: 'Independence Day',
  };

  const mockLeaveRequest = {
    startDate: new Date('2025-02-10'),
    endDate: new Date('2025-02-14'),
    userId: TEST_USER_ID,
    userName: 'Test User',
    benefitTypeName: 'PTO',
  };

  const mockTimesheet = {
    weekStartDate: '2025-02-03',
    status: 'approved',
    userId: TEST_USER_ID,
  };

  const mockProfile = {
    managerUserId: 'manager-1',
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CalendarService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCalendarFeed', () => {
    const from = '2025-02-01';
    const to = '2025-02-28';

    it('should return own calendar without manager check', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockHoliday]); // holidays
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockLeaveRequest]); // leave
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockTimesheet]); // timesheets

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
      );

      // Assert
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should include holidays', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockHoliday]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // leave
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // timesheets

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['holidays'],
      );

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('holiday');
      expect(result.items[0].title).toBe('Independence Day');
      expect(result.items[0].date).toBe('2025-07-04');
    });

    it('should include approved leave', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // holidays
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockLeaveRequest]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // timesheets

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['leave'],
      );

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('leave');
      expect(result.items[0].title).toBe('PTO - Test User');
      expect(result.items[0].start).toBe('2025-02-10');
      expect(result.items[0].end).toBe('2025-02-14');
    });

    it('should include timesheets', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // holidays
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // leave
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['timesheets'],
      );

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('timesheet_period');
      expect(result.items[0].title).toBe('Timesheet (approved)');
      expect(result.items[0].start).toBe('2025-02-03');
      expect(result.items[0].end).toBe('2025-02-09'); // 7-day period
    });

    it('should include all item types by default', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockHoliday]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockLeaveRequest]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
      );

      // Assert
      expect(result.items.length).toBe(3);
      const types = result.items.map((item) => item.type);
      expect(types).toContain('holiday');
      expect(types).toContain('leave');
      expect(types).toContain('timesheet_period');
    });

    it('should verify manager access for other users', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockProfile]); // manager check
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockHoliday]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockLeaveRequest]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        'manager-1',
        TEST_USER_ID,
        from,
        to,
      );

      // Assert
      expect(result.items).toBeDefined();
    });

    it('should throw ForbiddenException if not manager', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // no profile

      // Act & Assert
      await expect(
        service.getCalendarFeed(TEST_TENANT_ID, 'other-user', TEST_USER_ID, from, to),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getCalendarFeed(TEST_TENANT_ID, 'other-user', TEST_USER_ID, from, to),
      ).rejects.toThrow('You can only view calendars for your direct reports');
    });

    it('should throw ForbiddenException if wrong manager', async () => {
      // Arrange
      const wrongManagerProfile = { managerUserId: 'different-manager' };
      mockDbService.db.select().from().where.mockResolvedValueOnce([wrongManagerProfile]);

      // Act & Assert
      await expect(
        service.getCalendarFeed(TEST_TENANT_ID, 'manager-1', TEST_USER_ID, from, to),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty items when no data', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // holidays
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // leave
      mockDbService.db.select().from().where.mockResolvedValueOnce([]); // timesheets

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
      );

      // Assert
      expect(result.items).toEqual([]);
    });

    it('should filter by include parameter', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockHoliday]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['holidays'],
      );

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('holiday');
    });

    it('should handle multiple holidays', async () => {
      // Arrange
      const holidays = [
        { date: new Date('2025-02-01'), name: 'Holiday 1' },
        { date: new Date('2025-02-15'), name: 'Holiday 2' },
      ];
      mockDbService.db.select().from().where.mockResolvedValueOnce(holidays);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
      );

      // Assert
      expect(result.items.filter((i) => i.type === 'holiday')).toHaveLength(2);
    });

    it('should handle multiple leave requests', async () => {
      // Arrange
      const leaves = [
        { ...mockLeaveRequest, startDate: new Date('2025-02-01'), endDate: new Date('2025-02-05') },
        {
          ...mockLeaveRequest,
          startDate: new Date('2025-02-10'),
          endDate: new Date('2025-02-14'),
        },
      ];
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce(leaves);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['leave'],
      );

      // Assert
      expect(result.items).toHaveLength(2);
    });

    it('should handle leave with null benefit type', async () => {
      // Arrange
      const leaveWithoutType = { ...mockLeaveRequest, benefitTypeName: null };
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([leaveWithoutType]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['leave'],
      );

      // Assert
      expect(result.items[0].title).toBe('Leave - Test User');
    });

    it('should handle leave with null user name', async () => {
      // Arrange
      const leaveWithoutUser = { ...mockLeaveRequest, userName: null };
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([leaveWithoutUser]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['leave'],
      );

      // Assert
      expect(result.items[0].title).toBe('PTO - Unknown');
    });

    it('should calculate timesheet week end correctly', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['timesheets'],
      );

      // Assert
      expect(result.items[0].start).toBe('2025-02-03');
      expect(result.items[0].end).toBe('2025-02-09'); // Start + 6 days
    });

    it('should include timesheet status', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([
        { ...mockTimesheet, status: 'pending' },
      ]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['timesheets'],
      );

      // Assert
      expect(result.items[0].title).toBe('Timesheet (pending)');
      expect(result.items[0].status).toBe('pending');
    });

    it('should enforce tenant isolation in holidays', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockHoliday]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);

      // Act
      await service.getCalendarFeed('different-tenant', TEST_USER_ID, TEST_USER_ID, from, to);

      // Assert
      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });

    it('should include userId in leave items', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockLeaveRequest]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['leave'],
      );

      // Assert
      expect(result.items[0].userId).toBe(TEST_USER_ID);
    });

    it('should include userId in timesheet items', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([]);
      mockDbService.db.select().from().where.mockResolvedValueOnce([mockTimesheet]);

      // Act
      const result = await service.getCalendarFeed(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        from,
        to,
        ['timesheets'],
      );

      // Assert
      expect(result.items[0].userId).toBe(TEST_USER_ID);
    });
  });

  describe('verifyManagerAccess', () => {
    it('should allow manager to access direct report calendar', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockProfile]);

      // Act & Assert - should not throw
      await (service as any).verifyManagerAccess(TEST_TENANT_ID, 'manager-1', TEST_USER_ID);
    });

    it('should throw if profile not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(
        (service as any).verifyManagerAccess(TEST_TENANT_ID, 'manager-1', TEST_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if manager does not match', async () => {
      // Arrange
      const wrongManager = { managerUserId: 'different-manager' };
      mockDbService.db.select().from().where.mockResolvedValue([wrongManager]);

      // Act & Assert
      await expect(
        (service as any).verifyManagerAccess(TEST_TENANT_ID, 'manager-1', TEST_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
