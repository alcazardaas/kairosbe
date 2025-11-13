import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { TEST_TENANT_ID } from '../../test/constants';

/**
 * OrganizationController Unit Tests
 * Tests HTTP request/response handling for organization endpoints
 * Target Coverage: 100%
 */
describe('OrganizationController', () => {
  let controller: OrganizationController;
  let service: vi.Mocked<OrganizationService>;

  const mockOrganization = {
    id: TEST_TENANT_ID,
    name: 'Acme Corporation',
    slug: 'acme-corp',
    phone: '+1-555-123-4567',
    address: '123 Main Street, San Francisco, CA 94105',
    logoUrl: 'https://cdn.example.com/logo.png',
    timezone: 'America/New_York',
    country: 'US',
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    service = {
      getOrganization: vi.fn(),
      updateOrganization: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [{ provide: OrganizationService, useValue: service }],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /organization', () => {
    it('should return organization details', async () => {
      // Arrange
      const mockResponse = { data: mockOrganization };
      service.getOrganization.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.getOrganization).toHaveBeenCalledWith(TEST_TENANT_ID);
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.getOrganization.mockResolvedValue({ data: mockOrganization });

      // Act
      await controller.getOrganization('tenant-123');

      // Assert
      expect(service.getOrganization).toHaveBeenCalledWith('tenant-123');
    });

    it('should return organization with all fields', async () => {
      // Arrange
      service.getOrganization.mockResolvedValue({ data: mockOrganization });

      // Act
      const result = await controller.getOrganization(TEST_TENANT_ID);

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

    it('should wrap result in data property', async () => {
      // Arrange
      service.getOrganization.mockResolvedValue({ data: mockOrganization });

      // Act
      const result = await controller.getOrganization(TEST_TENANT_ID);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toBeTypeOf('object');
    });
  });

  describe('PATCH /organization', () => {
    const updateDto = {
      name: 'Updated Corp',
      phone: '+1-555-999-8888',
      address: '456 Oak Avenue, New York, NY 10001',
    };

    it('should update organization', async () => {
      // Arrange
      const updated = {
        ...mockOrganization,
        name: 'Updated Corp',
        phone: '+1-555-999-8888',
      };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result.data.name).toBe('Updated Corp');
      expect(result.data.phone).toBe('+1-555-999-8888');
      expect(service.updateOrganization).toHaveBeenCalledWith(TEST_TENANT_ID, updateDto);
    });

    it('should extract tenantId from decorator', async () => {
      // Arrange
      service.updateOrganization.mockResolvedValue({ data: mockOrganization });

      // Act
      await controller.updateOrganization('tenant-456', updateDto);

      // Assert
      expect(service.updateOrganization).toHaveBeenCalledWith('tenant-456', updateDto);
    });

    it('should update only name', async () => {
      // Arrange
      const updated = { ...mockOrganization, name: 'New Name' };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, { name: 'New Name' });

      // Assert
      expect(result.data.name).toBe('New Name');
    });

    it('should update only phone', async () => {
      // Arrange
      const updated = { ...mockOrganization, phone: '+1-555-000-0000' };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, {
        phone: '+1-555-000-0000',
      });

      // Assert
      expect(result.data.phone).toBe('+1-555-000-0000');
    });

    it('should update only address', async () => {
      // Arrange
      const updated = { ...mockOrganization, address: 'New Address' };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, {
        address: 'New Address',
      });

      // Assert
      expect(result.data.address).toBe('New Address');
    });

    it('should update only logoUrl', async () => {
      // Arrange
      const updated = { ...mockOrganization, logoUrl: 'https://new-cdn.com/logo.png' };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, {
        logoUrl: 'https://new-cdn.com/logo.png',
      });

      // Assert
      expect(result.data.logoUrl).toBe('https://new-cdn.com/logo.png');
    });

    it('should update only timezone', async () => {
      // Arrange
      const updated = { ...mockOrganization, timezone: 'Europe/London' };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, {
        timezone: 'Europe/London',
      });

      // Assert
      expect(result.data.timezone).toBe('Europe/London');
    });

    it('should update only country', async () => {
      // Arrange
      const updated = { ...mockOrganization, country: 'GB' };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, { country: 'GB' });

      // Assert
      expect(result.data.country).toBe('GB');
    });

    it('should clear optional fields with null', async () => {
      // Arrange
      const cleared = {
        ...mockOrganization,
        phone: null,
        address: null,
        logoUrl: null,
        country: null,
      };
      service.updateOrganization.mockResolvedValue({ data: cleared });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, {
        phone: null,
        address: null,
        logoUrl: null,
        country: null,
      });

      // Assert
      expect(result.data.phone).toBeNull();
      expect(result.data.address).toBeNull();
      expect(result.data.logoUrl).toBeNull();
      expect(result.data.country).toBeNull();
    });

    it('should update multiple fields', async () => {
      // Arrange
      const updated = {
        ...mockOrganization,
        name: 'New Corp',
        phone: '+1-555-111-2222',
        timezone: 'America/Chicago',
      };
      service.updateOrganization.mockResolvedValue({ data: updated });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, {
        name: 'New Corp',
        phone: '+1-555-111-2222',
        timezone: 'America/Chicago',
      });

      // Assert
      expect(result.data.name).toBe('New Corp');
      expect(result.data.phone).toBe('+1-555-111-2222');
      expect(result.data.timezone).toBe('America/Chicago');
    });

    it('should wrap result in data property', async () => {
      // Arrange
      service.updateOrganization.mockResolvedValue({ data: mockOrganization });

      // Act
      const result = await controller.updateOrganization(TEST_TENANT_ID, updateDto);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toBeTypeOf('object');
    });
  });
});
