import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { eq, and } from 'drizzle-orm';
import { AuthService } from './auth.service';
import { LoginDto, loginSchema } from './dto/login.dto';
import { RefreshTokenDto, refreshTokenSchema } from './dto/refresh.dto';
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshRequestDto,
  RefreshResponseDto,
  MeResponseDto,
} from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentSession, CurrentTenantId } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DbService } from '../db/db.service';
import { users, memberships, timesheetPolicies } from '../db/schema';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly db: DbService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticate user and create a new session. Returns session token and refresh token.',
  })
  @ApiOkResponse({
    description: 'Successfully authenticated',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format or password too short',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);
    return {
      data: result,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  @ApiOperation({
    summary: 'Refresh session token',
    description: 'Use refresh token to obtain a new session token. Refresh token rotates on use.',
  })
  @ApiOkResponse({
    description: 'New session token generated',
    type: RefreshResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid refresh token format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token expired or invalid',
    type: ErrorResponseDto,
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return {
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Logout and invalidate session',
    description: 'Invalidates the current session token immediately.',
  })
  @ApiNoContentResponse({
    description: 'Session invalidated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async logout(@CurrentSession() session: any) {
    await this.authService.logout(session.token);
  }

  @Get('me')
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Get current user context',
    description: 'Returns current user information, tenant, membership role, and timesheet policy.',
  })
  @ApiOkResponse({
    description: 'Current user context retrieved',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getCurrentUser(
    @CurrentSession() session: any,
    @CurrentTenantId() tenantId: string,
  ) {
    // Get user details
    const [user] = await this.db.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Get membership details
    const [membership] = await this.db.db
      .select({
        id: memberships.id,
        role: memberships.role,
        status: memberships.status,
      })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, session.userId),
          eq(memberships.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new Error('Membership not found');
    }

    // Get timesheet policy for the tenant
    const [policy] = await this.db.db
      .select()
      .from(timesheetPolicies)
      .where(eq(timesheetPolicies.tenantId, tenantId))
      .limit(1);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
        },
        tenant: {
          id: tenantId,
        },
        membership: {
          role: membership.role,
          status: membership.status,
        },
        timesheetPolicy: policy || null,
      },
    };
  }
}
