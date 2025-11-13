import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserImportService } from './services/user-import.service';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';
import { Response } from 'express';

/**
 * UsersController Unit Tests
 * Tests HTTP request/response handling for user management endpoints
 * Target Coverage: 100%
 */
describe('UsersController', () => {
  let controller: UsersController;
  let service: vi.Mocked<UsersService>;
  let importService: vi.Mocked<UserImportService>;

  const mockSession = {
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
  };

  const mockUser = {
    id: TEST_USER_ID,
    email: 'user@example.com',
    name: 'Test User',
    locale: 'en',
    createdAt: new Date(),
    lastLoginAt: null,
    membership: {
      role: 'employee',
      status: 'active',
      createdAt: new Date(),
    },
    profile: {
      jobTitle: 'Developer',
      startDate: new Date('2025-01-01'),
      managerUserId: null,
      location: 'NYC',
      phone: '+15555555555',
    },
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      create: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reactivate: vi.fn(),
    } as any;

    importService = {
      importUsers: vi.fn(),
      generateTemplate: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: service },
        { provide: UserImportService, useValue: importService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /users', () => {
    it('should return paginated users', async () => {
      // Arrange
      const mockResponse = {
        data: [mockUser],
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

    it('should pass search query to service', async () => {
      // Arrange
      const mockResponse = {
        data: [mockUser],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, q: 'john' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        q: 'john',
      });
    });

    it('should filter by role', async () => {
      // Arrange
      const mockResponse = {
        data: [mockUser],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, role: 'employee' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        role: 'employee',
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const mockResponse = {
        data: [mockUser],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, status: 'active' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        status: 'active',
      });
    });

    it('should filter by manager', async () => {
      // Arrange
      const mockResponse = {
        data: [mockUser],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      // Act
      await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20, managerId: 'manager-1' });

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, {
        page: 1,
        limit: 20,
        managerId: 'manager-1',
      });
    });

    it('should handle sorting', async () => {
      // Arrange
      const mockResponse = {
        data: [mockUser],
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
  });

  describe('POST /users', () => {
    const createDto = {
      email: 'new@example.com',
      name: 'New User',
      role: 'employee' as const,
      sendInvite: false,
    };

    it('should create new user', async () => {
      // Arrange
      const mockResponse = { data: mockUser };
      service.create.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.create(TEST_TENANT_ID, mockSession, createDto);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto, TEST_USER_ID);
    });

    it('should extract userId from session', async () => {
      // Arrange
      service.create.mockResolvedValue({ data: mockUser });
      const customSession = { userId: 'admin-123', tenantId: TEST_TENANT_ID };

      // Act
      await controller.create(TEST_TENANT_ID, customSession, createDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto, 'admin-123');
    });

    it('should create user with profile', async () => {
      // Arrange
      const dtoWithProfile = {
        ...createDto,
        profile: { jobTitle: 'Developer', managerUserId: 'manager-1' },
      };
      service.create.mockResolvedValue({ data: mockUser });

      // Act
      await controller.create(TEST_TENANT_ID, mockSession, dtoWithProfile);

      // Assert
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, dtoWithProfile, TEST_USER_ID);
    });

    it('should create user with invitation', async () => {
      // Arrange
      const dtoWithInvite = { ...createDto, sendInvite: true };
      service.create.mockResolvedValue({ data: mockUser });

      // Act
      await controller.create(TEST_TENANT_ID, mockSession, dtoWithInvite);

      // Assert
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, dtoWithInvite, TEST_USER_ID);
    });
  });

  describe('PATCH /users/:id', () => {
    const updateDto = {
      name: 'Updated Name',
      role: 'manager' as const,
    };

    it('should update user', async () => {
      // Arrange
      const mockResponse = { data: { ...mockUser, name: 'Updated Name' } };
      service.update.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.update(TEST_TENANT_ID, 'user-123', mockSession, updateDto);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'user-123',
        updateDto,
        TEST_USER_ID,
      );
    });

    it('should extract userId from session', async () => {
      // Arrange
      service.update.mockResolvedValue({ data: mockUser });
      const customSession = { userId: 'admin-456', tenantId: TEST_TENANT_ID };

      // Act
      await controller.update(TEST_TENANT_ID, 'user-123', customSession, updateDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'user-123',
        updateDto,
        'admin-456',
      );
    });

    it('should update user profile', async () => {
      // Arrange
      const updateWithProfile = { profile: { jobTitle: 'Senior Developer' } };
      service.update.mockResolvedValue({ data: mockUser });

      // Act
      await controller.update(TEST_TENANT_ID, 'user-123', mockSession, updateWithProfile);

      // Assert
      expect(service.update).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'user-123',
        updateWithProfile,
        TEST_USER_ID,
      );
    });

    it('should update only name', async () => {
      // Arrange
      service.update.mockResolvedValue({ data: mockUser });

      // Act
      await controller.update(TEST_TENANT_ID, 'user-123', mockSession, { name: 'New Name' });

      // Assert
      expect(service.update).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'user-123',
        { name: 'New Name' },
        TEST_USER_ID,
      );
    });
  });

  describe('DELETE /users/:id', () => {
    it('should deactivate user', async () => {
      // Arrange
      service.delete.mockResolvedValue(undefined);

      // Act
      await controller.delete(TEST_TENANT_ID, 'user-123', mockSession);

      // Assert
      expect(service.delete).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-123', TEST_USER_ID);
    });

    it('should return void (204 No Content)', async () => {
      // Arrange
      service.delete.mockResolvedValue(undefined);

      // Act
      const result = await controller.delete(TEST_TENANT_ID, 'user-123', mockSession);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should extract userId from session', async () => {
      // Arrange
      service.delete.mockResolvedValue(undefined);
      const customSession = { userId: 'admin-789', tenantId: TEST_TENANT_ID };

      // Act
      await controller.delete(TEST_TENANT_ID, 'user-123', customSession);

      // Assert
      expect(service.delete).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-123', 'admin-789');
    });
  });

  describe('PUT /users/:id/reactivate', () => {
    it('should reactivate user', async () => {
      // Arrange
      service.reactivate.mockResolvedValue(undefined);

      // Act
      await controller.reactivate(TEST_TENANT_ID, 'user-123', mockSession);

      // Assert
      expect(service.reactivate).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-123', TEST_USER_ID);
    });

    it('should return void (204 No Content)', async () => {
      // Arrange
      service.reactivate.mockResolvedValue(undefined);

      // Act
      const result = await controller.reactivate(TEST_TENANT_ID, 'user-123', mockSession);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should extract userId from session', async () => {
      // Arrange
      service.reactivate.mockResolvedValue(undefined);
      const customSession = { userId: 'admin-999', tenantId: TEST_TENANT_ID };

      // Act
      await controller.reactivate(TEST_TENANT_ID, 'user-123', customSession);

      // Assert
      expect(service.reactivate).toHaveBeenCalledWith(TEST_TENANT_ID, 'user-123', 'admin-999');
    });
  });

  describe('POST /users/import', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'users.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: 1024,
      buffer: Buffer.from('email,name\ntest@example.com,Test User'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should import users from file', async () => {
      // Arrange
      const mockResult = {
        success: 1,
        failed: 0,
        errors: [],
        users: [mockUser],
      };
      importService.importUsers.mockResolvedValue(mockResult);

      // Act
      const result = await controller.importUsers(TEST_TENANT_ID, mockSession, mockFile, {
        dryRun: false,
      });

      // Assert
      expect(result).toEqual(mockResult);
      expect(importService.importUsers).toHaveBeenCalledWith(
        mockFile,
        TEST_TENANT_ID,
        TEST_USER_ID,
        false,
      );
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      // Act & Assert
      await expect(
        controller.importUsers(TEST_TENANT_ID, mockSession, undefined as any, { dryRun: false }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importUsers(TEST_TENANT_ID, mockSession, undefined as any, { dryRun: false }),
      ).rejects.toThrow('No file uploaded');
    });

    it('should handle dry run mode', async () => {
      // Arrange
      const mockResult = {
        success: 0,
        failed: 0,
        errors: [],
        users: [],
      };
      importService.importUsers.mockResolvedValue(mockResult);

      // Act
      await controller.importUsers(TEST_TENANT_ID, mockSession, mockFile, { dryRun: true });

      // Assert
      expect(importService.importUsers).toHaveBeenCalledWith(
        mockFile,
        TEST_TENANT_ID,
        TEST_USER_ID,
        true,
      );
    });

    it('should extract userId from session', async () => {
      // Arrange
      const mockResult = {
        success: 1,
        failed: 0,
        errors: [],
        users: [mockUser],
      };
      importService.importUsers.mockResolvedValue(mockResult);
      const customSession = { userId: 'admin-import', tenantId: TEST_TENANT_ID };

      // Act
      await controller.importUsers(TEST_TENANT_ID, customSession, mockFile, { dryRun: false });

      // Assert
      expect(importService.importUsers).toHaveBeenCalledWith(
        mockFile,
        TEST_TENANT_ID,
        'admin-import',
        false,
      );
    });
  });

  describe('GET /users/import/template', () => {
    it('should download CSV template', async () => {
      // Arrange
      const mockTemplate = {
        buffer: Buffer.from('email,name,role\n'),
        filename: 'user-import-template.csv',
        mimetype: 'text/csv',
      };
      importService.generateTemplate.mockReturnValue(mockTemplate);

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      // Act
      await controller.downloadTemplate({ format: 'csv' }, mockRes);

      // Assert
      expect(importService.generateTemplate).toHaveBeenCalledWith('csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="user-import-template.csv"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockTemplate.buffer);
    });

    it('should download Excel template', async () => {
      // Arrange
      const mockTemplate = {
        buffer: Buffer.from('mock excel data'),
        filename: 'user-import-template.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      importService.generateTemplate.mockReturnValue(mockTemplate);

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      // Act
      await controller.downloadTemplate({ format: 'xlsx' }, mockRes);

      // Assert
      expect(importService.generateTemplate).toHaveBeenCalledWith('xlsx');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should set correct headers for file download', async () => {
      // Arrange
      const mockTemplate = {
        buffer: Buffer.from('test'),
        filename: 'template.csv',
        mimetype: 'text/csv',
      };
      importService.generateTemplate.mockReturnValue(mockTemplate);

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      // Act
      await controller.downloadTemplate({ format: 'csv' }, mockRes);

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledTimes(2);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment'),
      );
    });
  });
});
