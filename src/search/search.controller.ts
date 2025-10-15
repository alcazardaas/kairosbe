import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('projects')
  async searchProjects(
    @CurrentTenantId() tenantId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const results = await this.searchService.searchProjects(tenantId, query, parsedLimit);
    return {
      data: results,
      meta: {
        query,
        count: results.length,
      },
    };
  }

  @Get('tasks')
  async searchTasks(
    @CurrentTenantId() tenantId: string,
    @Query('q') query: string,
    @Query('project_id') projectId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const results = await this.searchService.searchTasks(tenantId, query, projectId, parsedLimit);
    return {
      data: results,
      meta: {
        query,
        projectId,
        count: results.length,
      },
    };
  }
}
