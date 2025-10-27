import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';
import { SearchProjectsResponseDto, SearchTasksResponseDto } from './dto/search-response.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Search')
@ApiSecurity('session')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('projects')
  @ApiOperation({
    summary: 'Search projects',
    description: 'Search projects by name or code within the current tenant.',
  })
  @ApiOkResponse({
    description: 'Search results retrieved successfully',
    type: SearchProjectsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Search tasks',
    description: 'Search tasks by name within the current tenant, optionally filtered by project.',
  })
  @ApiOkResponse({
    description: 'Search results retrieved successfully',
    type: SearchTasksResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
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
