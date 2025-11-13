import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { DbService } from '../../db/db.service';

describe('AuditService', () => {
  let service: AuditService;
  let dbService: jest.Mocked<DbService>;

  const mockDrizzle = {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: DbService,
          useValue: {
            drizzle: mockDrizzle,
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    dbService = module.get(DbService) as jest.Mocked<DbService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create audit log entry with all fields', async () => {
      const auditData = {
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: 'create',
        entity: 'users',
        entityId: 'entity-789',
        beforeJson: { name: 'Old Name' },
        afterJson: { name: 'New Name' },
      };

      await service.log(auditData);

      expect(mockDrizzle.insert).toHaveBeenCalled();
      expect(mockDrizzle.insert().values).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: 'create',
        entity: 'users',
        entityId: 'entity-789',
        beforeJson: { name: 'Old Name' },
        afterJson: { name: 'New Name' },
      });
    });

    it('should create audit log entry with optional fields as null', async () => {
      const auditData = {
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: 'delete',
        entity: 'projects',
      };

      await service.log(auditData);

      expect(mockDrizzle.insert).toHaveBeenCalled();
      expect(mockDrizzle.insert().values).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: 'delete',
        entity: 'projects',
        entityId: null,
        beforeJson: null,
        afterJson: null,
      });
    });

    it('should not throw error if database insert fails', async () => {
      mockDrizzle.insert().values.mockRejectedValueOnce(new Error('Database error'));

      const auditData = {
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: 'update',
        entity: 'tasks',
      };

      await expect(service.log(auditData)).resolves.not.toThrow();
    });
  });

  describe('logBulkUserImport', () => {
    it('should create audit log for bulk user import', async () => {
      const metadata = {
        fileName: 'users.csv',
        totalRows: 100,
        createdCount: 85,
        existingCount: 15,
        errorCount: 0,
        dryRun: false,
      };

      await service.logBulkUserImport('tenant-123', 'user-456', metadata);

      expect(mockDrizzle.insert).toHaveBeenCalled();
      expect(mockDrizzle.insert().values).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: 'bulk_user_import',
        entity: 'users',
        entityId: null,
        beforeJson: null,
        afterJson: metadata,
      });
    });

    it('should create audit log for dry-run import', async () => {
      const metadata = {
        fileName: 'users.xlsx',
        totalRows: 50,
        createdCount: 0,
        existingCount: 0,
        errorCount: 0,
        dryRun: true,
      };

      await service.logBulkUserImport('tenant-789', 'user-abc', metadata);

      expect(mockDrizzle.insert).toHaveBeenCalled();
      expect(mockDrizzle.insert().values).toHaveBeenCalledWith({
        tenantId: 'tenant-789',
        actorUserId: 'user-abc',
        action: 'bulk_user_import',
        entity: 'users',
        entityId: null,
        beforeJson: null,
        afterJson: metadata,
      });
    });
  });
});
