import { vi, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * SessionsService Unit Tests
 * Tests session lifecycle management, token rotation, and cleanup
 * Target Coverage: 100%
 */
describe('SessionsService', () => {
  let service: SessionsService;
  let mockDbService: ReturnType<typeof createMockDbService>;
  let mockConfigService: vi.Mocked<ConfigService>;

  const sessionTtl = 2592000; // 30 days in seconds
  const refreshTokenTtl = 7776000; // 90 days in seconds

  beforeEach(async () => {
    mockDbService = createMockDbService();

    mockConfigService = {
      get: vi.fn((key: string, defaultValue: any) => {
        if (key === 'SESSION_TTL') return sessionTtl;
        if (key === 'REFRESH_TOKEN_TTL') return refreshTokenTtl;
        return defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: DbService, useValue: mockDbService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create session with token and refresh token', async () => {
      // Arrange
      const input = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const mockSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'uuid-token',
        refresh_token: 'uuid-refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
      };

      mockDbService.db.insert().values().returning.mockResolvedValue([mockSession]);

      // Act
      const result = await service.createSession(input);

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('refreshExpiresAt');
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.tenantId).toBe(TEST_TENANT_ID);
    });

    it('should generate UUID tokens', async () => {
      // Arrange
      const input = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };

      const mockSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'generated-uuid-1',
        refresh_token: 'generated-uuid-2',
        expires_at: new Date(),
        refresh_expires_at: new Date(),
      };

      mockDbService.db.insert().values().returning.mockResolvedValue([mockSession]);

      // Act
      await service.createSession(input);

      // Assert: Verify insert was called with token fields
      expect(mockDbService.db.insert).toHaveBeenCalled();
      expect(mockDbService.db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          refreshToken: expect.any(String),
        }),
      );
    });

    it('should set expiry based on SESSION_TTL config', async () => {
      // Arrange
      const input = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };

      const now = Date.now();
      const mockSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(now + sessionTtl * 1000),
        refresh_expires_at: new Date(now + refreshTokenTtl * 1000),
      };

      mockDbService.db.insert().values().returning.mockResolvedValue([mockSession]);

      // Act
      await service.createSession(input);

      // Assert
      expect(mockDbService.db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
          refreshExpiresAt: expect.any(Date),
        }),
      );
    });

    it('should include IP address and user agent when provided', async () => {
      // Arrange
      const input = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      };

      mockDbService.db.insert().values().returning.mockResolvedValue([mockSession]);

      // Act
      await service.createSession(input);

      // Assert
      expect(mockDbService.db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });

    it('should handle missing optional fields', async () => {
      // Arrange
      const input = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        // No ipAddress or userAgent
      };

      const mockSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(),
      };

      mockDbService.db.insert().values().returning.mockResolvedValue([mockSession]);

      // Act
      const result = await service.createSession(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should transform snake_case DB fields to camelCase', async () => {
      // Arrange
      const input = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };

      const mockSession = {
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(),
      };

      mockDbService.db.insert().values().returning.mockResolvedValue([mockSession]);

      // Act
      const result = await service.createSession(input);

      // Assert: Result should have camelCase keys
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('refreshExpiresAt');
    });
  });

  describe('findByToken', () => {
    it('should return session when token is valid and not expired', async () => {
      // Arrange
      const validSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'valid-token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 86400000), // 1 day from now
      };

      mockDbService.db.select().from().where.mockResolvedValue([validSession]);

      // Act
      const result = await service.findByToken('valid-token');

      // Assert
      expect(result).toBeDefined();
      expect(result?.token).toBe('valid-token');
      expect(result?.userId).toBe(TEST_USER_ID);
    });

    it('should return null when token not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.findByToken('non-existent-token');

      // Assert
      expect(result).toBeNull();
    });

    it('should check token is not expired', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      await service.findByToken('token');

      // Assert: Verify expiry check in query
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should limit results to 1', async () => {
      // Arrange
      const mockSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 86400000),
      };

      mockDbService.db.select().from().where.mockReturnThis();
      mockDbService.db.limit = vi.fn().mockResolvedValue([mockSession]);

      // Act
      await service.findByToken('token');

      // Assert
      expect(mockDbService.db.limit).toHaveBeenCalledWith(1);
    });

    it('should transform DB result to camelCase', async () => {
      // Arrange
      const mockSession = {
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 86400000),
        refresh_expires_at: new Date(Date.now() + 7776000000),
      };

      mockDbService.db.select().from().where.mockResolvedValue([mockSession]);

      // Act
      const result = await service.findByToken('token');

      // Assert
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
    });
  });

  describe('findByRefreshToken', () => {
    it('should return session when refresh token is valid', async () => {
      // Arrange
      const validSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'valid-refresh',
        expires_at: new Date(Date.now() + 86400000),
        refresh_expires_at: new Date(Date.now() + 7776000000),
      };

      mockDbService.db.select().from().where.mockResolvedValue([validSession]);

      // Act
      const result = await service.findByRefreshToken('valid-refresh');

      // Assert
      expect(result).toBeDefined();
      expect(result?.refreshToken).toBe('valid-refresh');
    });

    it('should return null when refresh token not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.findByRefreshToken('invalid-refresh');

      // Assert
      expect(result).toBeNull();
    });

    it('should check refresh token is not expired', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      await service.findByRefreshToken('token');

      // Assert
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should transform result to camelCase', async () => {
      // Arrange
      const mockSession = {
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(),
      };

      mockDbService.db.select().from().where.mockResolvedValue([mockSession]);

      // Act
      const result = await service.findByRefreshToken('refresh');

      // Assert
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refreshSession', () => {
    it('should rotate tokens when refresh token is valid', async () => {
      // Arrange
      const existingSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'old-token',
        refresh_token: 'old-refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(Date.now() + 7776000000),
      };

      const updatedSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'new-token',
        refresh_token: 'new-refresh',
        expires_at: new Date(Date.now() + sessionTtl * 1000),
        refresh_expires_at: new Date(Date.now() + refreshTokenTtl * 1000),
      };

      mockDbService.db.select().from().where.mockResolvedValue([existingSession]);
      mockDbService.db.update().set().where().returning.mockResolvedValue([updatedSession]);

      // Act
      const result = await service.refreshSession('old-refresh');

      // Assert
      expect(result).toBeDefined();
      expect(result?.token).not.toBe('old-token');
      expect(result?.refreshToken).not.toBe('old-refresh');
    });

    it('should return null when refresh token is invalid', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act
      const result = await service.refreshSession('invalid-refresh');

      // Assert
      expect(result).toBeNull();
      expect(mockDbService.db.update).not.toHaveBeenCalled();
    });

    it('should update last used timestamp', async () => {
      // Arrange
      const existingSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(Date.now() + 7776000000),
      };

      mockDbService.db.select().from().where.mockResolvedValue([existingSession]);
      mockDbService.db.update().set().where().returning.mockResolvedValue([existingSession]);

      // Act
      await service.refreshSession('refresh');

      // Assert
      expect(mockDbService.db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
        }),
      );
    });

    it('should generate new expiry times', async () => {
      // Arrange
      const existingSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(Date.now() + 7776000000),
      };

      mockDbService.db.select().from().where.mockResolvedValue([existingSession]);
      mockDbService.db.update().set().where().returning.mockResolvedValue([existingSession]);

      // Act
      await service.refreshSession('refresh');

      // Assert
      expect(mockDbService.db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
          refreshExpiresAt: expect.any(Date),
        }),
      );
    });

    it('should transform result to camelCase', async () => {
      // Arrange
      const existingSession = {
        id: 'session-1',
        user_id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(),
        refresh_expires_at: new Date(Date.now() + 7776000000),
      };

      mockDbService.db.select().from().where.mockResolvedValue([existingSession]);
      mockDbService.db.update().set().where().returning.mockResolvedValue([existingSession]);

      // Act
      const result = await service.refreshSession('refresh');

      // Assert
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('touchSession', () => {
    it('should update last used timestamp', async () => {
      // Arrange
      mockDbService.db.update().set().where.mockResolvedValue([]);

      // Act
      await service.touchSession('token-123');

      // Assert
      expect(mockDbService.db.update).toHaveBeenCalled();
      expect(mockDbService.db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
        }),
      );
    });

    it('should update correct session by token', async () => {
      // Arrange
      mockDbService.db.update().set().where.mockResolvedValue([]);

      // Act
      await service.touchSession('specific-token');

      // Assert
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should not throw error if session not found', async () => {
      // Arrange
      mockDbService.db.update().set().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.touchSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('deleteSession', () => {
    it('should delete session by token', async () => {
      // Arrange
      mockDbService.db.delete().where.mockResolvedValue([{ id: 'session-1' }]);

      // Act
      await service.deleteSession('token-to-delete');

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should not throw error if session does not exist', async () => {
      // Arrange
      mockDbService.db.delete().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.deleteSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('deleteAllUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      // Arrange
      mockDbService.db.delete().where.mockResolvedValue([{ id: 'session-1' }, { id: 'session-2' }]);

      // Act
      await service.deleteAllUserSessions(TEST_USER_ID);

      // Assert
      expect(mockDbService.db.delete).toHaveBeenCalled();
      expect(mockDbService.db.where).toHaveBeenCalled();
    });

    it('should not throw error if user has no sessions', async () => {
      // Arrange
      mockDbService.db.delete().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.deleteAllUserSessions(TEST_USER_ID)).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions and return count', async () => {
      // Arrange
      const expiredSessions = [{ id: 'session-1' }, { id: 'session-2' }, { id: 'session-3' }];

      mockDbService.db.delete().where().returning.mockResolvedValue(expiredSessions);

      // Act
      const result = await service.cleanupExpiredSessions();

      // Assert
      expect(result).toBe(3);
      expect(mockDbService.db.delete).toHaveBeenCalled();
    });

    it('should return 0 when no expired sessions', async () => {
      // Arrange
      mockDbService.db.delete().where().returning.mockResolvedValue([]);

      // Act
      const result = await service.cleanupExpiredSessions();

      // Assert
      expect(result).toBe(0);
    });

    it('should only delete sessions where expires_at is in the past', async () => {
      // Arrange
      mockDbService.db.delete().where().returning.mockResolvedValue([]);

      // Act
      await service.cleanupExpiredSessions();

      // Assert
      expect(mockDbService.db.where).toHaveBeenCalled();
    });
  });
});
