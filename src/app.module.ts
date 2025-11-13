import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { SearchModule } from './search/search.module';
import { BenefitTypesModule } from './benefit-types/benefit-types.module';
import { HolidaysModule } from './holidays/holidays.module';
import { TimesheetPoliciesModule } from './timesheet-policies/timesheet-policies.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { CalendarModule } from './calendar/calendar.module';
import { UsersModule } from './users/users.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 3600000, // 1 hour in milliseconds
        limit: 4, // max 4 requests per hour
      },
    ]),
    DbModule,
    AuthModule,
    HealthModule,
    ProjectsModule,
    TasksModule,
    TimeEntriesModule,
    TimesheetsModule,
    SearchModule,
    BenefitTypesModule,
    HolidaysModule,
    TimesheetPoliciesModule,
    LeaveRequestsModule,
    CalendarModule,
    UsersModule,
    OrganizationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
