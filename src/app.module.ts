import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { BenefitTypesModule } from './benefit-types/benefit-types.module';
import { HolidaysModule } from './holidays/holidays.module';
import { TimesheetPoliciesModule } from './timesheet-policies/timesheet-policies.module';

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
    DbModule,
    AuthModule,
    HealthModule,
    ProjectsModule,
    TasksModule,
    TimeEntriesModule,
    BenefitTypesModule,
    HolidaysModule,
    TimesheetPoliciesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
