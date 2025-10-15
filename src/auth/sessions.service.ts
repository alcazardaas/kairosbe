import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { eq, and, gt, lt } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { sessions } from '../db/schema';

export interface CreateSessionInput {
  userId: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionData {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  refreshToken: string | null;
  expiresAt: Date;
  refreshExpiresAt: Date | null;
}

@Injectable()
export class SessionsService {
  private readonly sessionTtl: number;
  private readonly refreshTokenTtl: number;

  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService,
  ) {
    // Default: 30 days in seconds
    this.sessionTtl = this.config.get<number>('SESSION_TTL', 2592000);
    // Default: 90 days in seconds
    this.refreshTokenTtl = this.config.get<number>('REFRESH_TOKEN_TTL', 7776000);
  }

  /**
   * Create a new session for a user
   */
  async createSession(input: CreateSessionInput): Promise<SessionData> {
    const token = randomUUID();
    const refreshToken = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtl * 1000);
    const refreshExpiresAt = new Date(now.getTime() + this.refreshTokenTtl * 1000);

    const [session] = await this.db.db.insert(sessions).values({
      userId: input.userId,
      tenantId: input.tenantId,
      token,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    }).returning();

    return session as SessionData;
  }

  /**
   * Find a session by token
   */
  async findByToken(token: string): Promise<SessionData | null> {
    const [session] = await this.db.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session ? (session as SessionData) : null;
  }

  /**
   * Find a session by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<SessionData | null> {
    const [session] = await this.db.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshToken, refreshToken),
          gt(sessions.refreshExpiresAt, new Date()),
        ),
      )
      .limit(1);

    return session ? (session as SessionData) : null;
  }

  /**
   * Refresh a session (rotate tokens)
   */
  async refreshSession(oldRefreshToken: string): Promise<SessionData | null> {
    const session = await this.findByRefreshToken(oldRefreshToken);
    if (!session) {
      return null;
    }

    // Generate new tokens
    const newToken = randomUUID();
    const newRefreshToken = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtl * 1000);
    const refreshExpiresAt = new Date(now.getTime() + this.refreshTokenTtl * 1000);

    const [updated] = await this.db.db
      .update(sessions)
      .set({
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt,
        refreshExpiresAt,
        lastUsedAt: now,
      })
      .where(eq(sessions.id, session.id))
      .returning();

    return updated as SessionData;
  }

  /**
   * Update session last used timestamp
   */
  async touchSession(token: string): Promise<void> {
    await this.db.db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.token, token));
  }

  /**
   * Delete a session (logout)
   */
  async deleteSession(token: string): Promise<void> {
    await this.db.db
      .delete(sessions)
      .where(eq(sessions.token, token));
  }

  /**
   * Delete all sessions for a user (logout everywhere)
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.db.db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning();

    return result.length;
  }
}
