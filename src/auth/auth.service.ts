import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { SessionsService, SessionData } from './sessions.service';
import { users, memberships, tenants, passwordResetTokens, sessions } from '../db/schema';
import { verifyPassword, hashPassword } from './password.util';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';
import { ConfigService } from '@nestjs/config';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  tenant: {
    id: string;
  };
}

export interface SignupResponse {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    role: string;
    status: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resetTokenExpiryMinutes = 15; // Token valid for 15 minutes

  constructor(
    private readonly db: DbService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user with email and password
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Find user by email
    const [user] = await this.db.db.select().from(users).where(eq(users.email, dto.email)).limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user memberships
    const userMemberships = await this.db.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, 'active')));

    if (userMemberships.length === 0) {
      throw new UnauthorizedException('No active tenant memberships found');
    }

    // Determine which tenant to use
    let tenantId: string;
    if (dto.tenantId) {
      // Verify user has access to requested tenant
      const membership = userMemberships.find((m) => m.tenantId === dto.tenantId);
      if (!membership) {
        throw new BadRequestException('User does not have access to the specified tenant');
      }
      tenantId = dto.tenantId;
    } else {
      // Use first active membership
      tenantId = userMemberships[0].tenantId;
    }

    // Create session
    const session = await this.sessionsService.createSession({
      userId: user.id,
      tenantId,
      ipAddress,
      userAgent,
    });

    // Update last login timestamp
    await this.db.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return {
      token: session.token,
      refreshToken: session.refreshToken!,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenant: {
        id: tenantId,
      },
    };
  }

  /**
   * Refresh session using refresh token
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const session = await this.sessionsService.refreshSession(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user info
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      token: session.token,
      refreshToken: session.refreshToken!,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenant: {
        id: session.tenantId,
      },
    };
  }

  /**
   * Logout user by invalidating session
   */
  async logout(token: string): Promise<void> {
    await this.sessionsService.deleteSession(token);
  }

  /**
   * Validate a session token and return session data
   */
  async validateSession(token: string): Promise<SessionData | null> {
    const session = await this.sessionsService.findByToken(token);
    if (session) {
      // Touch session to update last used timestamp
      await this.sessionsService.touchSession(token);
    }
    return session;
  }

  /**
   * Create new tenant and user account (self-service signup)
   */
  async signup(dto: SignupDto, ipAddress?: string, userAgent?: string): Promise<SignupResponse> {
    // 1. Check if email already exists
    const [existingUser] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    // 2. Generate unique slug from company name
    const slug = await this.generateUniqueSlug(dto.companyName);

    // 3. Hash password
    const passwordHash = await hashPassword(dto.password);

    // 4. Create tenant (company/organization)
    const [tenant] = await this.db.db
      .insert(tenants)
      .values({
        name: dto.companyName,
        slug,
        timezone: dto.timezone || 'UTC',
      })
      .returning();

    // 5. Create user account
    const fullName = `${dto.firstName} ${dto.lastName}`;
    const [user] = await this.db.db
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        passwordHash,
        name: fullName,
        locale: 'en',
      })
      .returning();

    // 6. Create admin membership
    const [membership] = await this.db.db
      .insert(memberships)
      .values({
        userId: user.id,
        tenantId: tenant.id,
        role: 'admin',
        status: 'active',
      })
      .returning();

    // 7. Update tenant owner
    await this.db.db.update(tenants).set({ ownerUserId: user.id }).where(eq(tenants.id, tenant.id));

    // 8. Create session (auto-login)
    const session = await this.sessionsService.createSession({
      userId: user.id,
      tenantId: tenant.id,
      ipAddress,
      userAgent,
    });

    // 9. Return response
    return {
      token: session.token,
      refreshToken: session.refreshToken!,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name!,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      membership: {
        role: membership.role,
        status: membership.status,
      },
    };
  }

  /**
   * Generate unique slug from company name
   * Converts to lowercase, replaces spaces with hyphens, removes special chars
   * Adds random suffix if slug already exists
   */
  private async generateUniqueSlug(companyName: string): Promise<string> {
    // Base slug: lowercase, spaces to hyphens, remove special chars
    let baseSlug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/-+/g, '-') // Multiple hyphens to single
      .replace(/^-|-$/g, ''); // Trim hyphens from ends

    // Ensure slug is not empty
    if (!baseSlug) {
      baseSlug = 'company';
    }

    // Check if slug exists
    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const [existing] = await this.db.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!existing) {
        isUnique = true;
      } else {
        // Slug exists, add counter
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    return slug;
  }

  /**
   * Change password for authenticated user
   * Requires current password verification
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    // Get user with password hash
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or has no password set');
    }

    // Verify current password
    const isValid = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await verifyPassword(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(dto.newPassword);

    // Update password
    await this.db.db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, userId));

    // Invalidate all user sessions (force re-login for security)
    await this.db.db
      .delete(sessions)
      .where(eq(sessions.userId, userId));

    this.logger.log(`Password changed successfully for user ${userId}`);
  }

  /**
   * Generate password reset token
   * Public endpoint - always returns success message (security: don't reveal if email exists)
   */
  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string): Promise<void> {
    // Find user by email
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    // Security: Always return success message even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${dto.email}`);
      return;
    }

    // Get user's tenant (use first active membership)
    const [membership] = await this.db.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, 'active')))
      .limit(1);

    if (!membership) {
      this.logger.warn(`Password reset requested for user with no active tenant: ${user.id}`);
      return;
    }

    // Invalidate any existing unused tokens for this user
    await this.db.db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    // Generate new reset token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.resetTokenExpiryMinutes);

    const [resetToken] = await this.db.db
      .insert(passwordResetTokens)
      .values({
        userId: user.id,
        tenantId: membership.tenantId,
        expiresAt,
        ipAddress,
      })
      .returning();

    // Get frontend URL from config (default to localhost for POC)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken.token}`;

    // POC MODE: Log token to console for manual distribution
    this.logger.log('======================================');
    this.logger.log('PASSWORD RESET TOKEN GENERATED (POC MODE)');
    this.logger.log('======================================');
    this.logger.log(`User: ${user.email}`);
    this.logger.log(`Reset Link: ${resetLink}`);
    this.logger.log(`Expires: ${expiresAt.toISOString()}`);
    this.logger.log('======================================');

    // TODO: Replace with email service when available
    // await this.emailService.sendPasswordResetEmail(user.email, resetLink);
  }

  /**
   * Reset password using token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // Find valid token
    const [tokenRecord] = await this.db.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, dto.token))
      .limit(1);

    // Validate token exists
    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate token not used
    if (tokenRecord.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Validate token not expired
    if (new Date() > tokenRecord.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Get user
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new password is same as current (optional security check)
    if (user.passwordHash) {
      const isSamePassword = await verifyPassword(dto.newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from current password');
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(dto.newPassword);

    // Update password
    await this.db.db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, user.id));

    // Mark token as used
    await this.db.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenRecord.id));

    // Invalidate all user sessions (force re-login for security)
    await this.db.db
      .delete(sessions)
      .where(eq(sessions.userId, user.id));

    this.logger.log(`Password reset successfully for user ${user.id}`);
  }

  /**
   * Get active password reset tokens (Admin only - POC mode)
   * Allows admins to retrieve reset links for manual distribution
   */
  async getActiveResetTokens(tenantId: string): Promise<
    Array<{
      email: string;
      resetLink: string;
      expiresAt: Date;
      createdAt: Date;
    }>
  > {
    // Get all active (unused, non-expired) tokens for tenant
    const tokens = await this.db.db
      .select({
        token: passwordResetTokens.token,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        createdAt: passwordResetTokens.createdAt,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tenantId, tenantId),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      );

    // Get user emails for each token
    const result = await Promise.all(
      tokens.map(async (tokenRecord) => {
        const [user] = await this.db.db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, tokenRecord.userId))
          .limit(1);

        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
        const resetLink = `${frontendUrl}/reset-password?token=${tokenRecord.token}`;

        return {
          email: user?.email || 'unknown',
          resetLink,
          expiresAt: tokenRecord.expiresAt,
          createdAt: tokenRecord.createdAt!,
        };
      }),
    );

    return result;
  }
}
