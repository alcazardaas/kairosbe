import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * CalendarController Unit Tests
 * Tests HTTP request/response handling for calendar endpoints
 * Target Coverage: 100%
 */
describe('CalendarController', () => {
  let controller: CalendarController;
  let service: vi.Mocked<CalendarService>;

  const mockSession = {
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
  };

  const mockCalendarItems = {
    items: [
      {
        type: 'holiday' as const,
        title: 'Independence Day',
        date: '2025-07-04',
      },
      {
        type: 'leave' as const,
        title: 'PTO - Test User',
        start: '2025-02-10',
        end: '2025-02-14',
        userId: TEST_USER_ID,
      },
      {
        type: 'timesheet_period' as const,
        title: 'Timesheet (approved)',
        start: '2025-02-03',
        end: '2025-02-09',
        status: 'approved',
        userId: TEST_USER_ID,
      },
    ],
  };

  beforeEach(async () => {
    service = {
      getCalendarFeed: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [{ provide: CalendarService, useValue: service }],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /calendar', () => {
    it('should return calendar feed', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      const result = await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
        undefined,
      );

      // Assert
      expect(result).toEqual(mockCalendarItems);
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave', 'timesheets'],
      );
    });

    it('should throw BadRequestException if from is missing', async () => {
      // Act & Assert
      await expect(
        controller.getCalendar(TEST_TENANT_ID, mockSession, undefined, undefined, '2025-02-28'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getCalendar(TEST_TENANT_ID, mockSession, undefined, undefined, '2025-02-28'),
      ).rejects.toThrow('Both "from" and "to" date parameters are required');
    });

    it('should throw BadRequestException if to is missing', async () => {
      // Act & Assert
      await expect(
        controller.getCalendar(TEST_TENANT_ID, mockSession, undefined, '2025-02-01', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default to current user if user_id not provided', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID, // Defaults to session userId
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave', 'timesheets'],
      );
    });

    it('should use provided user_id', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        'other-user',
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'other-user',
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave', 'timesheets'],
      );
    });

    it('should parse include parameter', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
        'holidays,leave',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave'],
      );
    });

    it('should default to all items if include not provided', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
        undefined,
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave', 'timesheets'],
      );
    });

    it('should trim include items', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
        ' holidays , leave ',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave'],
      );
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        'tenant-123',
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        'tenant-123',
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        expect.any(Array),
      );
    });

    it('should extract userId from session', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);
      const customSession = { userId: 'user-456', tenantId: TEST_TENANT_ID };

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        customSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'user-456',
        'user-456',
        '2025-02-01',
        '2025-02-28',
        expect.any(Array),
      );
    });

    it('should return all calendar item types', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      const result = await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(result.items).toHaveLength(3);
      const types = result.items.map((item) => item.type);
      expect(types).toContain('holiday');
      expect(types).toContain('leave');
      expect(types).toContain('timesheet_period');
    });

    it('should return empty items when no data', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue({ items: [] });

      // Act
      const result = await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
      );

      // Assert
      expect(result.items).toEqual([]);
    });

    it('should handle single include item', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue({ items: [mockCalendarItems.items[0]] });

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
        'holidays',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        ['holidays'],
      );
    });

    it('should handle three include items', async () => {
      // Arrange
      service.getCalendarFeed.mockResolvedValue(mockCalendarItems);

      // Act
      await controller.getCalendar(
        TEST_TENANT_ID,
        mockSession,
        undefined,
        '2025-02-01',
        '2025-02-28',
        'holidays,leave,timesheets',
      );

      // Assert
      expect(service.getCalendarFeed).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_USER_ID,
        '2025-02-01',
        '2025-02-28',
        ['holidays', 'leave', 'timesheets'],
      );
    });
  });
});
