import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { DbModule } from '../db/db.module';

/**
 * Organization module
 * Manages organization/tenant settings and profile
 */
@Module({
  imports: [DbModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
