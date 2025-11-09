import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
