import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { SessionsService, SessionData } from './sessions.service';
import { users, memberships, tenants } from '../db/schema';
import { verifyPassword, hashPassword } from './password.util';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
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
}
