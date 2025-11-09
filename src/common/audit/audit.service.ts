import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { auditLogs } from '../../db/schema/audit';

export interface CreateAuditLogDto {
  tenantId: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeJson?: any;
  afterJson?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DbService) {}

  /**
   * Create an audit log entry
   * @param data Audit log data
   */
  async log(data: CreateAuditLogDto): Promise<void> {
    try {
      const db = this.db.getDb();
      await db.insert(auditLogs).values({
        tenantId: data.tenantId,
        actorUserId: data.actorUserId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        beforeJson: data.beforeJson ?? null,
        afterJson: data.afterJson ?? null,
      });

      this.logger.log(
        `Audit log created: ${data.action} on ${data.entity} by user ${data.actorUserId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw error - audit logging should not break the main operation
    }
  }

  /**
   * Log bulk user import operation
   * @param tenantId Tenant ID
   * @param actorUserId User who performed the import
   * @param metadata Import metadata (file name, row counts, etc.)
   */
  async logBulkUserImport(
    tenantId: string,
    actorUserId: string,
    metadata: {
      fileName: string;
      totalRows: number;
      createdCount: number;
      existingCount: number;
      errorCount: number;
      dryRun: boolean;
    },
  ): Promise<void> {
    await this.log({
      tenantId,
      actorUserId,
      action: 'bulk_user_import',
      entity: 'users',
      afterJson: metadata,
    });
  }
}
