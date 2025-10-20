import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';
import { ProjectMembersResponseDto } from './dto/project-response.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('My Projects')
@ApiSecurity('session')
@Controller('my/projects')
export class MyProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get my projects',
    description: 'Retrieve all projects that the current user is assigned to.',
  })
  @ApiOkResponse({
    description: 'User projects retrieved successfully',
    type: ProjectMembersResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getMyProjects(@CurrentTenantId() tenantId: string, @CurrentSession() session: any) {
    const projects = await this.projectsService.getMyProjects(tenantId, session.userId);
    return {
      data: projects,
    };
  }
}
