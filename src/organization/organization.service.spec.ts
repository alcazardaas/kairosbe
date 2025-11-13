import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * OrganizationService Unit Tests
 * Tests organization/tenant profile management
 * Target Coverage: 100%
 */
describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockOrganization = {
    id: TEST_TENANT_ID,
    name: 'Acme Corporation',
    slug: 'acme-corp',
    phone: '+1-555-123-4567',
    address: '123 Main Street, San Francisco, CA 94105',
    logoUrl: 'https://cdn.example.com/logo.png',
    timezone: 'America/New_York',
    country: 'US',
    createdAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationService, { provide: DbService, useValue: mockDbService }],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrganization', () => {
    it('should return organization details', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(TEST_TENANT_ID);
      expect(result.data.name).toBe('Acme Corporation');
      expect(result.data.slug).toBe('acme-corp');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getOrganization('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getOrganization('nonexistent')).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should transform keys to camelCase', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(result.data).toHaveProperty('logoUrl');
      expect(result.data).toHaveProperty('createdAt');
    });

    it('should return organization with all fields', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('slug');
      expect(result.data).toHaveProperty('phone');
      expect(result.data).toHaveProperty('address');
      expect(result.data).toHaveProperty('logoUrl');
      expect(result.data).toHaveProperty('timezone');
      expect(result.data).toHaveProperty('country');
      expect(result.data).toHaveProperty('createdAt');
    });

    it('should convert createdAt to ISO string', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(typeof result.data.createdAt).toBe('string');
      expect(result.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should wrap result in data property', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toBeTypeOf('object');
    });
  });

  describe('updateOrganization', () => {
    const updateDto = {
      name: 'Updated Corp',
      phone: '+1-555-999-8888',
      address: '456 Oak Avenue, New York, NY 10001',
      timezone: 'America/Los_Angeles',
    };

    it('should update organization', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]); // exists check
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          name: 'Updated Corp',
          phone: '+1-555-999-8888',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result.data.name).toBe('Updated Corp');
      expect(result.data.phone).toBe('+1-555-999-8888');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      mockDbService.db.select().from().where.mockResolvedValue([]);

      // Act & Assert
      await expect(service.updateOrganization('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateOrganization('nonexistent', updateDto)).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should update only provided fields', async () => {
      // Arrange
      const partialDto = { name: 'New Name' };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          name: 'New Name',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, partialDto);

      // Assert
      expect(result.data.name).toBe('New Name');
    });

    it('should update name only', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          name: 'New Name',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, { name: 'New Name' });

      // Assert
      expect(result.data.name).toBe('New Name');
    });

    it('should update phone only', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          phone: '+1-555-000-0000',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, {
        phone: '+1-555-000-0000',
      });

      // Assert
      expect(result.data.phone).toBe('+1-555-000-0000');
    });

    it('should update address only', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          address: 'New Address',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, { address: 'New Address' });

      // Assert
      expect(result.data.address).toBe('New Address');
    });

    it('should update logoUrl only', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          logoUrl: 'https://new-cdn.com/logo.png',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, {
        logoUrl: 'https://new-cdn.com/logo.png',
      });

      // Assert
      expect(result.data.logoUrl).toBe('https://new-cdn.com/logo.png');
    });

    it('should update timezone only', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          timezone: 'Europe/London',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, {
        timezone: 'Europe/London',
      });

      // Assert
      expect(result.data.timezone).toBe('Europe/London');
    });

    it('should update country only', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          country: 'GB',
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, { country: 'GB' });

      // Assert
      expect(result.data.country).toBe('GB');
    });

    it('should clear optional fields with null', async () => {
      // Arrange
      const clearDto = {
        phone: null,
        address: null,
        logoUrl: null,
        country: null,
      };
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([
        {
          ...mockOrganization,
          phone: null,
          address: null,
          logoUrl: null,
          country: null,
        },
      ]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, clearDto);

      // Assert
      expect(result.data.phone).toBeNull();
      expect(result.data.address).toBeNull();
      expect(result.data.logoUrl).toBeNull();
      expect(result.data.country).toBeNull();
    });

    it('should transform keys to camelCase', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result.data).toHaveProperty('logoUrl');
      expect(result.data).toHaveProperty('createdAt');
    });

    it('should wrap result in data property', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toBeTypeOf('object');
    });

    it('should convert createdAt to ISO string', async () => {
      // Arrange
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ id: TEST_TENANT_ID }]);
      mockDbService.db.update().set.mockResolvedValue([mockOrganization]);

      // Act
      const result = await service.updateOrganization(TEST_TENANT_ID, updateDto);

      // Assert
      expect(typeof result.data.createdAt).toBe('string');
      expect(result.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
