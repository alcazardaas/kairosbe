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

@Injectable()
export class TasksService {
  constructor(private readonly dbService: DbService) {}

  async findAll(query: QueryTasksDto): Promise<PaginatedResponse<typeof tasks.$inferSelect>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, tenant_id, project_id, parent_task_id, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenant_id) {
      conditions.push(eq(tasks.tenantId, tenant_id));
    }
    if (project_id) {
      conditions.push(eq(tasks.projectId, project_id));
    }
    if (parent_task_id !== undefined) {
      // Allow filtering for null parent_task_id (root tasks)
      if (parent_task_id === null) {
        conditions.push(isNull(tasks.parentTaskId));
      } else {
        conditions.push(eq(tasks.parentTaskId, parent_task_id));
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
        tenant_id: tasks.tenantId,
        project_id: tasks.projectId,
        parent_task_id: tasks.parentTaskId,
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

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<typeof tasks.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return result[0];
  }

  async create(createTaskDto: CreateTaskDto): Promise<typeof tasks.$inferSelect> {
    const db = this.dbService.getDb();

    // Validate parent_task_id exists if provided
    if (createTaskDto.parent_task_id) {
      await this.findOne(createTaskDto.parent_task_id);
    }

    try {
      const result = await db
        .insert(tasks)
        .values({
          tenantId: createTaskDto.tenant_id,
          projectId: createTaskDto.project_id,
          name: createTaskDto.name,
          parentTaskId: createTaskDto.parent_task_id,
        })
        .returning();

      return result[0];
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
          throw new BadRequestException(`Project with ID ${createTaskDto.project_id} not found`);
        }
        if (error.constraint?.includes('tenant_id')) {
          throw new BadRequestException(`Tenant with ID ${createTaskDto.tenant_id} not found`);
        }
      }
      throw error;
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<typeof tasks.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if task exists
    await this.findOne(id);

    // Prevent circular references: task cannot be its own parent
    if (updateTaskDto.parent_task_id && updateTaskDto.parent_task_id === id) {
      throw new BadRequestException('A task cannot be its own parent');
    }

    // Validate parent_task_id exists if provided
    if (updateTaskDto.parent_task_id) {
      await this.findOne(updateTaskDto.parent_task_id);

      // Additional check: prevent circular reference chains
      await this.validateNoCircularReference(id, updateTaskDto.parent_task_id);
    }

    try {
      const result = await db
        .update(tasks)
        .set({
          ...(updateTaskDto.name !== undefined && { name: updateTaskDto.name }),
          ...(updateTaskDto.parent_task_id !== undefined && {
            parentTaskId: updateTaskDto.parent_task_id,
          }),
        })
        .where(eq(tasks.id, id))
        .returning();

      return result[0];
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
