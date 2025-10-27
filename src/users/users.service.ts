import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { users, memberships, profiles, invitations } from '../db/schema';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { eq, and, ilike, sql, desc, asc, or } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DbService) {}

  async findAll(tenantId: string, query: QueryUsersDto): Promise<PaginatedResponse<any>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, q, role, status, manager_id } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [eq(memberships.tenantId, tenantId)];

    // Search by name or email
    if (q) {
      const searchCondition = or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Filter by role
    if (role) {
      conditions.push(eq(memberships.role, role));
    }

    // Filter by status
    if (status) {
      conditions.push(eq(memberships.status, status));
    }

    // Filter by manager (direct reports)
    if (manager_id) {
      conditions.push(eq(profiles.managerUserId, manager_id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: users.id,
        name: users.name,
        email: users.email,
        created_at: users.createdAt,
        role: memberships.role,
        status: memberships.status,
      };
      const column = columnMap[field];
      if (column) {
        orderByClause = order === 'desc' ? desc(column) : asc(column);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(
        profiles,
        and(eq(profiles.userId, users.id), eq(profiles.tenantId, memberships.tenantId)),
      )
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        locale: users.locale,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        membership: {
          role: memberships.role,
          status: memberships.status,
          createdAt: memberships.createdAt,
        },
        profile: {
          jobTitle: profiles.jobTitle,
          startDate: profiles.startDate,
          managerUserId: profiles.managerUserId,
          location: profiles.location,
          phone: profiles.phone,
        },
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(
        profiles,
        and(eq(profiles.userId, users.id), eq(profiles.tenantId, memberships.tenantId)),
      )
      .where(whereClause)
      .orderBy(orderByClause || asc(users.name))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Create a new user or invite existing user to tenant
   */
  async create(tenantId: string, dto: CreateUserDto, currentUserId: string) {
    const db = this.dbService.getDb();

    // Check if user already exists by email
    const [existingUser] = await db.select().from(users).where(eq(users.email, dto.email)).limit(1);

    let userId: string;

    if (existingUser) {
      // User exists, check if already a member of this tenant
      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, existingUser.id), eq(memberships.tenantId, tenantId)))
        .limit(1);

      if (existingMembership) {
        throw new ConflictException('User is already a member of this tenant');
      }

      userId = existingUser.id;

      // Update name if provided and user doesn't have one
      if (dto.name && !existingUser.name) {
        await db.update(users).set({ name: dto.name }).where(eq(users.id, userId));
      }
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: dto.email,
          name: dto.name || null,
          locale: 'en',
        })
        .returning();

      userId = newUser.id;
    }

    // Create membership with 'invited' status
    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId,
        userId,
        role: dto.role,
        status: 'invited',
      })
      .returning();

    // Create profile if provided
    let profileData = null;
    if (dto.profile && Object.keys(dto.profile).length > 0) {
      // Validate manager if provided
      if (dto.profile.managerUserId) {
        await this.validateManager(tenantId, dto.profile.managerUserId, userId);
      }

      const [profile] = await db
        .insert(profiles)
        .values({
          tenantId,
          userId,
          jobTitle: dto.profile.jobTitle || null,
          startDate: dto.profile.startDate ? new Date(dto.profile.startDate) : null,
          managerUserId: dto.profile.managerUserId || null,
          location: dto.profile.location || null,
          phone: dto.profile.phone || null,
        })
        .returning();

      profileData = {
        jobTitle: profile.jobTitle,
        startDate: profile.startDate ? profile.startDate.toISOString().split('T')[0] : null,
        managerUserId: profile.managerUserId,
        location: profile.location,
        phone: profile.phone,
      };
    }

    // Create invitation if sendInvite is true
    if (dto.sendInvite) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await db.insert(invitations).values({
        tenantId,
        email: dto.email,
        role: dto.role,
        token,
        expiresAt,
        invitedByUserId: currentUserId,
      });

      // TODO: Send invitation email
      // For now, just log the invitation
      console.log(`Invitation created for ${dto.email} with token: ${token}`);
    }

    // Fetch the created user data
    return this.findOne(tenantId, userId);
  }

  /**
   * Find a single user by ID within tenant
   */
  async findOne(tenantId: string, userId: string) {
    const db = this.dbService.getDb();

    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        locale: users.locale,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        membership: {
          role: memberships.role,
          status: memberships.status,
          createdAt: memberships.createdAt,
        },
        profile: {
          jobTitle: profiles.jobTitle,
          startDate: profiles.startDate,
          managerUserId: profiles.managerUserId,
          location: profiles.location,
          phone: profiles.phone,
        },
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(
        profiles,
        and(eq(profiles.userId, users.id), eq(profiles.tenantId, memberships.tenantId)),
      )
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1);

    if (!result) {
      throw new NotFoundException('User not found in this tenant');
    }

    return { data: result };
  }

  /**
   * Update user information
   */
  async update(tenantId: string, userId: string, dto: UpdateUserDto, currentUserId: string) {
    const db = this.dbService.getDb();

    // Verify user exists in tenant
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new NotFoundException('User not found in this tenant');
    }

    // Prevent self role change
    if (dto.role && userId === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    // Update user name if provided
    if (dto.name !== undefined) {
      await db.update(users).set({ name: dto.name }).where(eq(users.id, userId));
    }

    // Update membership role if provided
    if (dto.role !== undefined) {
      await db
        .update(memberships)
        .set({ role: dto.role })
        .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)));
    }

    // Update or create profile if provided
    if (dto.profile !== undefined && Object.keys(dto.profile).length > 0) {
      // Validate manager if changing
      if (dto.profile.managerUserId !== undefined) {
        if (dto.profile.managerUserId) {
          await this.validateManager(tenantId, dto.profile.managerUserId, userId);
        }
      }

      // Check if profile exists
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.tenantId, tenantId), eq(profiles.userId, userId)))
        .limit(1);

      const profileUpdate: any = {};
      if (dto.profile.jobTitle !== undefined) profileUpdate.jobTitle = dto.profile.jobTitle;
      if (dto.profile.startDate !== undefined) {
        profileUpdate.startDate = dto.profile.startDate ? new Date(dto.profile.startDate) : null;
      }
      if (dto.profile.managerUserId !== undefined)
        profileUpdate.managerUserId = dto.profile.managerUserId;
      if (dto.profile.location !== undefined) profileUpdate.location = dto.profile.location;
      if (dto.profile.phone !== undefined) profileUpdate.phone = dto.profile.phone;

      if (existingProfile) {
        // Update existing profile
        await db
          .update(profiles)
          .set(profileUpdate)
          .where(and(eq(profiles.tenantId, tenantId), eq(profiles.userId, userId)));
      } else {
        // Create new profile
        await db.insert(profiles).values({
          tenantId,
          userId,
          ...profileUpdate,
        });
      }
    }

    // Return updated user
    return this.findOne(tenantId, userId);
  }

  /**
   * Deactivate a user (soft delete)
   */
  async delete(tenantId: string, userId: string, currentUserId: string) {
    const db = this.dbService.getDb();

    // Prevent self-deactivation
    if (userId === currentUserId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    // Verify user exists in tenant
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new NotFoundException('User not found in this tenant');
    }

    // Get current user's role to check permissions
    const [currentUserMembership] = await db
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, currentUserId)))
      .limit(1);

    // If current user is a manager (not admin), verify target is a direct report
    if (currentUserMembership?.role === 'manager') {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(
          and(
            eq(profiles.tenantId, tenantId),
            eq(profiles.userId, userId),
            eq(profiles.managerUserId, currentUserId),
          ),
        )
        .limit(1);

      if (!profile) {
        throw new ForbiddenException('You can only deactivate your direct reports');
      }
    }

    // Update membership status to disabled
    await db
      .update(memberships)
      .set({ status: 'disabled' })
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)));

    // TODO: Optionally invalidate user sessions
  }

  /**
   * Validate manager assignment (prevent circular references)
   */
  private async validateManager(tenantId: string, managerId: string, userId: string) {
    const db = this.dbService.getDb();

    // Verify manager exists in tenant
    const [managerMembership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, managerId)))
      .limit(1);

    if (!managerMembership) {
      throw new BadRequestException('Manager not found in this tenant');
    }

    // Check for circular reference: walk up the manager chain
    const visited = new Set<string>();
    let currentManagerId: string | null = managerId;

    while (currentManagerId) {
      if (currentManagerId === userId) {
        throw new BadRequestException('Circular manager reference detected');
      }

      if (visited.has(currentManagerId)) {
        // Circular reference in existing data, break to avoid infinite loop
        break;
      }

      visited.add(currentManagerId);

      // Get next manager in chain
      const [profile] = await db
        .select({ managerUserId: profiles.managerUserId })
        .from(profiles)
        .where(and(eq(profiles.tenantId, tenantId), eq(profiles.userId, currentManagerId)))
        .limit(1);

      currentManagerId = profile?.managerUserId || null;
    }
  }
}
