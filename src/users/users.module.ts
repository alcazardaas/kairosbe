import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserImportService } from './services/user-import.service';
import { DbModule } from '../db/db.module';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService, UserImportService],
  exports: [UsersService],
})
export class UsersModule {}
