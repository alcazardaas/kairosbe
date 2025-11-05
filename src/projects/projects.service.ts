import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { projects, projectMembers, users } from '../db/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';

@Injectable()
export class ProjectsService {
  constructor(private readonly dbService: DbService) {}

  async findAll(tenantId: string, query: QueryProjectsDto): Promise<PaginatedResponse<typeof projects.$inferSelect>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, active, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions - always filter by tenantId
    const conditions = [eq(projects.tenantId, tenantId)];

    if (active !== undefined) {
      conditions.push(eq(projects.active, active));
    }
    if (search) {
      conditions.push(ilike(projects.name, `%${search}%`));
    }

    const whereClause = and(...conditions);

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: projects.id,
        name: projects.name,
        code: projects.code,
        active: projects.active,
      };
      const column = columnMap[field];
      if (column) {
        orderByClause = order === 'desc' ? desc(column) : asc(column);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(orderByClause || desc(projects.id))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<typeof projects.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return result[0];
  }

  async create(tenantId: string, createProjectDto: CreateProjectDto): Promise<typeof projects.$inferSelect> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(projects)
        .values({
          tenantId,
          name: createProjectDto.name,
          code: createProjectDto.code,
          active: createProjectDto.active,
          description: createProjectDto.description,
          startDate: createProjectDto.startDate,
          endDate: createProjectDto.endDate,
          clientName: createProjectDto.clientName,
          budgetHours: createProjectDto.budgetHours?.toString(),
        })
        .returning();

      return result[0];
    } catch (error) {
      // Handle unique constraint violation (tenant_id + name must be unique)
      if (error.code === '23505') {
        throw new ConflictException(
          `Project with name "${createProjectDto.name}" already exists for this tenant`,
        );
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<typeof projects.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if project exists and belongs to tenant
    await this.findOne(tenantId, id);

    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updateProjectDto.name !== undefined) updateData.name = updateProjectDto.name;
      if (updateProjectDto.code !== undefined) updateData.code = updateProjectDto.code;
      if (updateProjectDto.active !== undefined) updateData.active = updateProjectDto.active;
      if (updateProjectDto.description !== undefined) updateData.description = updateProjectDto.description;
      if (updateProjectDto.startDate !== undefined) updateData.startDate = updateProjectDto.startDate;
      if (updateProjectDto.endDate !== undefined) updateData.endDate = updateProjectDto.endDate;
      if (updateProjectDto.clientName !== undefined) updateData.clientName = updateProjectDto.clientName;
      if (updateProjectDto.budgetHours !== undefined) updateData.budgetHours = updateProjectDto.budgetHours?.toString();

      const result = await db
        .update(projects)
        .set(updateData)
        .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
        .returning();

      return result[0];
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new ConflictException(
          `Project with name "${updateProjectDto.name}" already exists for this tenant`,
        );
      }
      throw error;
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if project exists and belongs to tenant
    await this.findOne(tenantId, id);

    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
  }

  // ===== Project Membership Methods =====

  /**
   * Get all members of a project
   */
  async getMembers(tenantId: string, projectId: string) {
    const db = this.dbService.getDb();

    // Verify project exists and belongs to tenant
    await this.findOne(tenantId, projectId);

    const members = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        createdAt: projectMembers.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(and(eq(projectMembers.tenantId, tenantId), eq(projectMembers.projectId, projectId)));

    return members;
  }

  /**
   * Add a member to a project
   */
  async addMember(tenantId: string, projectId: string, userId: string, role?: string) {
    const db = this.dbService.getDb();

    // Verify project exists and belongs to tenant
    await this.findOne(tenantId, projectId);

    // Check if user exists in this tenant
    const [membership] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!membership) {
      throw new BadRequestException('User not found in this tenant');
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.tenantId, tenantId),
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const [member] = await db
      .insert(projectMembers)
      .values({
        tenantId,
        projectId,
        userId,
        role: role || 'member',
      })
      .returning();

    return member;
  }

  /**
   * Remove a member from a project
   */
  async removeMember(tenantId: string, projectId: string, userId: string) {
    const db = this.dbService.getDb();

    // Verify project exists and belongs to tenant
    await this.findOne(tenantId, projectId);

    const result = await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.tenantId, tenantId),
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('User is not a member of this project');
    }
  }

  /**
   * Add multiple members to a project in bulk
   */
  async bulkAddMembers(tenantId: string, projectId: string, userIds: string[], role?: string) {
    const db = this.dbService.getDb();

    // Verify project exists and belongs to tenant
    await this.findOne(tenantId, projectId);

    const results: {
      success: Array<{ userId: string; membershipId: string }>;
      failed: Array<{ userId: string; reason: string }>;
    } = {
      success: [],
      failed: [],
    };

    // Process each user
    for (const userId of userIds) {
      try {
        // Check if user exists in this tenant
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
          results.failed.push({
            userId,
            reason: 'User not found in this tenant',
          });
          continue;
        }

        // Check if already a member
        const [existing] = await db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.tenantId, tenantId),
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, userId),
            ),
          )
          .limit(1);

        if (existing) {
          results.failed.push({
            userId,
            reason: 'User is already a member of this project',
          });
          continue;
        }

        // Add member
        const [member] = await db
          .insert(projectMembers)
          .values({
            tenantId,
            projectId,
            userId,
            role: role || 'member',
          })
          .returning();

        results.success.push({
          userId,
          membershipId: member.id,
        });
      } catch (error) {
        results.failed.push({
          userId,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get all projects a user is a member of
   */
  async getMyProjects(tenantId: string, userId: string) {
    const db = this.dbService.getDb();

    const myProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
        active: projects.active,
        tenantId: projects.tenantId,
        memberRole: projectMembers.role,
        memberSince: projectMembers.createdAt,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(and(eq(projectMembers.tenantId, tenantId), eq(projectMembers.userId, userId)))
      .orderBy(desc(projects.name));

    return myProjects;
  }
}
