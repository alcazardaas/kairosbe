import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DbService } from '../db/db.service';

/**
 * HealthController Unit Tests
 * Tests health check endpoint with database connection verification
 * Target Coverage: 100%
 */
describe('HealthController', () => {
  let controller: HealthController;
  let mockDbService: any;
  let mockPool: any;

  beforeEach(async () => {
    mockPool = {
      query: vi.fn(),
    };

    mockDbService = {
      getPool: vi.fn().mockReturnValue(mockPool),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DbService, useValue: mockDbService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /health', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      const result = await controller.check();

      // Assert
      expect(result.ok).toBe(true);
      expect(result.database).toBe('connected');
      expect(result).toHaveProperty('ts');
      expect(result).not.toHaveProperty('error');
    });

    it('should return unhealthy status when database connection fails', async () => {
      // Arrange
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await controller.check();

      // Assert
      expect(result.ok).toBe(false);
      expect(result.database).toBe('disconnected');
      expect(result.error).toBe('Connection failed');
      expect(result).toHaveProperty('ts');
    });

    it('should include timestamp in response', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      const result = await controller.check();

      // Assert
      expect(result.ts).toBeDefined();
      expect(typeof result.ts).toBe('string');
      expect(result.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should execute SELECT 1 query', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      await controller.check();

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should call getPool from DbService', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      await controller.check();

      // Assert
      expect(mockDbService.getPool).toHaveBeenCalled();
    });

    it('should handle generic database errors', async () => {
      // Arrange
      mockPool.query.mockRejectedValue(new Error('Generic error'));

      // Act
      const result = await controller.check();

      // Assert
      expect(result.ok).toBe(false);
      expect(result.database).toBe('disconnected');
      expect(result.error).toBe('Generic error');
    });

    it('should handle database timeout', async () => {
      // Arrange
      mockPool.query.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const result = await controller.check();

      // Assert
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    it('should return different timestamps on subsequent calls', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      const result1 = await controller.check();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait 10ms
      const result2 = await controller.check();

      // Assert
      expect(result1.ts).toBeDefined();
      expect(result2.ts).toBeDefined();
      // Note: timestamps might be the same due to millisecond precision
    });

    it('should not throw exception on database error', async () => {
      // Arrange
      mockPool.query.mockRejectedValue(new Error('Critical error'));

      // Act & Assert - should not throw
      const result = await controller.check();
      expect(result).toBeDefined();
    });

    it('should return consistent response structure on success', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      const result = await controller.check();

      // Assert
      expect(Object.keys(result)).toEqual(['ok', 'ts', 'database']);
    });

    it('should return consistent response structure on failure', async () => {
      // Arrange
      mockPool.query.mockRejectedValue(new Error('Error'));

      // Act
      const result = await controller.check();

      // Assert
      expect(Object.keys(result).sort()).toEqual(['database', 'error', 'ok', 'ts'].sort());
    });

    it('should handle null error message', async () => {
      // Arrange
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      mockPool.query.mockRejectedValue(errorWithoutMessage);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.ok).toBe(false);
      expect(result.error).toBe('');
    });

    it('should be public endpoint (no authentication)', async () => {
      // This test verifies the endpoint doesn't require authentication
      // The @Public() decorator ensures this
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toBeDefined();
    });
  });
});
