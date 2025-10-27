import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from './auth.guard';
import { DbService } from '../../db/db.service';
import { memberships } from '../../db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Guard that checks if the current user has the required role(s) to access a route
 * Must be used after AuthGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;

    if (!session) {
      throw new ForbiddenException('No session found');
    }

    // Get user's membership to check role
    const [membership] = await this.db.db
      .select({ role: memberships.role })
      .from(memberships)
      .where(
        and(eq(memberships.userId, session.userId), eq(memberships.tenantId, session.tenantId)),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('User membership not found');
    }

    // Check if user's role is in the required roles
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
