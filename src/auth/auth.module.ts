import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { AuthGuard } from './guards/auth.guard';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule, ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, SessionsService],
})
export class AuthModule {}
