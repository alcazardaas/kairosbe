import { Module } from '@nestjs/common';
import { TimesheetPoliciesController } from './timesheet-policies.controller';
import { TimesheetPoliciesService } from './timesheet-policies.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [TimesheetPoliciesController],
  providers: [TimesheetPoliciesService],
  exports: [TimesheetPoliciesService],
})
export class TimesheetPoliciesModule {}
