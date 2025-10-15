import { Injectable } from '@nestjs/common';
import { ilike, and, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { projects, tasks } from '../db/schema';

@Injectable()
export class SearchService {
  constructor(private readonly db: DbService) {}

  /**
   * Search projects by name or code
   */
  async searchProjects(tenantId: string, query: string, limit: number = 10) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchPattern = `%${query}%`;

    const results = await this.db.db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
        active: projects.active,
        tenantId: projects.tenantId,
      })
      .from(projects)
      .where(
        and(
          eq(projects.tenantId, tenantId),
          eq(projects.active, true),
          // Search in both name and code
          ilike(projects.name, searchPattern),
        ),
      )
      .limit(limit);

    return results;
  }

  /**
   * Search tasks by name, optionally filtered by project
   */
  async searchTasks(tenantId: string, query: string, projectId?: string, limit: number = 10) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchPattern = `%${query}%`;
    const conditions = [
      eq(tasks.tenantId, tenantId),
      ilike(tasks.name, searchPattern),
    ];

    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }

    const results = await this.db.db
      .select({
        id: tasks.id,
        name: tasks.name,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
        tenantId: tasks.tenantId,
      })
      .from(tasks)
      .where(and(...conditions))
      .limit(limit);

    return results;
  }
}
