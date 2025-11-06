import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { SessionsService, SessionData } from './sessions.service';
import { users, memberships } from '../db/schema';
import { verifyPassword } from './password.util';
import { LoginDto } from './dto/login.dto';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

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

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly sessionsService: SessionsService,
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
}
