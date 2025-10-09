import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { projects } from '../db/schema/projects';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';

@Injectable()
export class ProjectsService {
  constructor(private readonly dbService: DbService) {}

  async findAll(query: QueryProjectsDto): Promise<PaginatedResponse<typeof projects.$inferSelect>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, tenant_id, active, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenant_id) {
      conditions.push(eq(projects.tenantId, tenant_id));
    }
    if (active !== undefined) {
      conditions.push(eq(projects.active, active));
    }
    if (search) {
      conditions.push(ilike(projects.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: projects.id,
        name: projects.name,
        code: projects.code,
        active: projects.active,
        tenant_id: projects.tenantId,
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

  async findOne(id: string): Promise<typeof projects.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return result[0];
  }

  async create(createProjectDto: CreateProjectDto): Promise<typeof projects.$inferSelect> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(projects)
        .values({
          tenantId: createProjectDto.tenant_id,
          name: createProjectDto.name,
          code: createProjectDto.code,
          active: createProjectDto.active,
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
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<typeof projects.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if project exists
    await this.findOne(id);

    try {
      const result = await db
        .update(projects)
        .set({
          ...(updateProjectDto.name !== undefined && { name: updateProjectDto.name }),
          ...(updateProjectDto.code !== undefined && { code: updateProjectDto.code }),
          ...(updateProjectDto.active !== undefined && { active: updateProjectDto.active }),
        })
        .where(eq(projects.id, id))
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

  async remove(id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if project exists
    await this.findOne(id);

    await db.delete(projects).where(eq(projects.id, id));
  }
}
