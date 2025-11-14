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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTooManyRequestsResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { eq, and } from 'drizzle-orm';
import { AuthService } from './auth.service';
import { LoginDto, loginSchema } from './dto/login.dto';
import { RefreshTokenDto, refreshTokenSchema } from './dto/refresh.dto';
import { SignupDto, signupSchema } from './dto/signup.dto';
import { ChangePasswordDto, changePasswordSchema } from './dto/change-password.dto';
import { ForgotPasswordDto, forgotPasswordSchema } from './dto/forgot-password.dto';
import { ResetPasswordDto, resetPasswordSchema } from './dto/reset-password.dto';
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshRequestDto,
  RefreshResponseDto,
  MeResponseDto,
  SignupRequestDto,
  SignupResponseDto,
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  AdminPasswordResetTokensResponseDto,
} from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentSession, CurrentTenantId, CurrentUserId } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
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
    description:
      'Authenticate user and create a new session. Returns session token and refresh token.',
  })
  @ApiBody({
    type: LoginRequestDto,
    description: 'Login credentials',
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
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    const result = await this.authService.login(dto, ip, userAgent);
    return {
      data: result,
    };
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 4, ttl: 3600000 } }) // 4 requests per hour
  @UsePipes(new ZodValidationPipe(signupSchema))
  @ApiOperation({
    summary: 'Create new account and organization',
    description:
      'Self-service signup. Creates new tenant (organization), user account with admin role, and returns session token for immediate login.',
  })
  @ApiBody({
    type: SignupRequestDto,
    description: 'Signup information',
  })
  @ApiCreatedResponse({
    description: 'Account created successfully. User is automatically logged in.',
    type: SignupResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email address already registered',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many signup attempts. Maximum 4 signups per hour per IP address.',
    type: ErrorResponseDto,
  })
  async signup(
    @Body() dto: SignupDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.signup(dto, ip, userAgent);
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
  @ApiBody({
    type: RefreshRequestDto,
    description: 'Refresh token',
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
  async getCurrentUser(@CurrentSession() session: any, @CurrentTenantId() tenantId: string) {
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
      .where(and(eq(memberships.userId, session.userId), eq(memberships.tenantId, tenantId)))
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

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Change password for authenticated user',
    description:
      'Change password for the currently logged-in user. Requires current password verification. All sessions will be invalidated after password change.',
  })
  @ApiBody({
    type: ChangePasswordRequestDto,
    description: 'Current and new password',
  })
  @ApiOkResponse({
    description: 'Password changed successfully. User must log in again.',
    type: ChangePasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'New password same as current or validation failed',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Current password is incorrect or session invalid',
    type: ErrorResponseDto,
  })
  async changePassword(@CurrentUserId() userId: string, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(userId, dto);
    return {
      message: 'Password changed successfully. Please log in again.',
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Generate a password reset token for the given email. For security, always returns success even if email does not exist. Token is logged to console in POC mode.',
  })
  @ApiBody({
    type: ForgotPasswordRequestDto,
    description: 'User email address',
  })
  @ApiOkResponse({
    description: 'Password reset instructions sent (if email exists)',
    type: ForgotPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many reset requests. Maximum 3 per hour per IP address.',
    type: ErrorResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    await this.authService.forgotPassword(dto, ip);
    return {
      message: 'If an account exists with this email, a password reset link will be sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Reset user password using the token from forgot-password flow. Token is single-use and expires after 15 minutes. All user sessions will be invalidated.',
  })
  @ApiBody({
    type: ResetPasswordRequestDto,
    description: 'Reset token and new password',
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid token, token expired, token already used, or validation failed',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  @Get('admin/password-reset-tokens')
  @ApiSecurity('session')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get active password reset tokens (Admin only - POC mode)',
    description:
      'Retrieve all active (unused, non-expired) password reset tokens for the tenant. Allows admins to manually distribute reset links during POC phase.',
  })
  @ApiOkResponse({
    description: 'Active password reset tokens retrieved',
    type: AdminPasswordResetTokensResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getActiveResetTokens(@CurrentTenantId() tenantId: string) {
    const tokens = await this.authService.getActiveResetTokens(tenantId);
    return {
      data: tokens,
    };
  }
}
