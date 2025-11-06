import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { tasks } from '../db/schema/projects';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { eq, and, ilike, sql, desc, asc, isNull } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

@Injectable()
export class TasksService {
  constructor(private readonly dbService: DbService) {}

  async findAll(query: QueryTasksDto): Promise<PaginatedResponse<any>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, tenantId, projectId, parentTaskId, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenantId) {
      conditions.push(eq(tasks.tenantId, tenantId));
    }
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    if (parentTaskId !== undefined) {
      // Allow filtering for null parentTaskId (root tasks)
      if (parentTaskId === null) {
        conditions.push(isNull(tasks.parentTaskId));
      } else {
        conditions.push(eq(tasks.parentTaskId, parentTaskId));
      }
    }
    if (search) {
      conditions.push(ilike(tasks.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: tasks.id,
        name: tasks.name,
        tenantId: tasks.tenantId,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
      };
      const column = columnMap[field];
      if (column) {
        orderByClause = order === 'desc' ? desc(column) : asc(column);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(orderByClause || desc(tasks.id))
      .limit(limit)
      .offset(offset);

    const transformedData = data.map((item) => transformKeysToCamel(item));
    return createPaginatedResponse(transformedData, total, page, limit);
  }

  async findOne(id: string): Promise<any> {
    const db = this.dbService.getDb();
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return transformKeysToCamel(result[0]);
  }

  async create(createTaskDto: CreateTaskDto): Promise<any> {
    const db = this.dbService.getDb();

    // Validate parentTaskId exists if provided
    if (createTaskDto.parentTaskId) {
      await this.findOne(createTaskDto.parentTaskId);
    }

    try {
      const result = await db
        .insert(tasks)
        .values({
          tenantId: createTaskDto.tenantId,
          projectId: createTaskDto.projectId,
          name: createTaskDto.name,
          parentTaskId: createTaskDto.parentTaskId,
        })
        .returning();

      return transformKeysToCamel(result[0]);
    } catch (error) {
      // Handle unique constraint violation (tenant_id + project_id + name must be unique)
      if (error.code === '23505') {
        throw new ConflictException(
          `Task with name "${createTaskDto.name}" already exists for this project`,
        );
      }
      // Handle foreign key constraint violations
      if (error.code === '23503') {
        if (error.constraint?.includes('project_id')) {
          throw new BadRequestException(`Project with ID ${createTaskDto.projectId} not found`);
        }
        if (error.constraint?.includes('tenant_id')) {
          throw new BadRequestException(`Tenant with ID ${createTaskDto.tenantId} not found`);
        }
      }
      throw error;
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<any> {
    const db = this.dbService.getDb();

    // Check if task exists
    await this.findOne(id);

    // Prevent circular references: task cannot be its own parent
    if (updateTaskDto.parentTaskId && updateTaskDto.parentTaskId === id) {
      throw new BadRequestException('A task cannot be its own parent');
    }

    // Validate parentTaskId exists if provided
    if (updateTaskDto.parentTaskId) {
      await this.findOne(updateTaskDto.parentTaskId);

      // Additional check: prevent circular reference chains
      await this.validateNoCircularReference(id, updateTaskDto.parentTaskId);
    }

    try {
      const result = await db
        .update(tasks)
        .set({
          ...(updateTaskDto.name !== undefined && { name: updateTaskDto.name }),
          ...(updateTaskDto.parentTaskId !== undefined && {
            parentTaskId: updateTaskDto.parentTaskId,
          }),
        })
        .where(eq(tasks.id, id))
        .returning();

      return transformKeysToCamel(result[0]);
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new ConflictException(
          `Task with name "${updateTaskDto.name}" already exists for this project`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if task exists
    await this.findOne(id);

    // Check if task has children
    const children = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.parentTaskId, id));

    if (children[0]?.count > 0) {
      throw new BadRequestException(
        `Cannot delete task with ID ${id} because it has ${children[0].count} child task(s)`,
      );
    }

    await db.delete(tasks).where(eq(tasks.id, id));
  }

  /**
   * Validate that setting parentTaskId won't create a circular reference
   */
  private async validateNoCircularReference(taskId: string, newParentId: string): Promise<void> {
    const db = this.dbService.getDb();
    const visited = new Set<string>([taskId]);
    let currentParentId: string | null = newParentId;

    // Traverse up the parent chain
    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException(
          'Cannot set parent: this would create a circular reference in the task hierarchy',
        );
      }

      visited.add(currentParentId);

      const parentTask = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, currentParentId))
        .limit(1);

      if (!parentTask.length) {
        break;
      }

      currentParentId = parentTask[0].parentTaskId;
    }
  }
}
