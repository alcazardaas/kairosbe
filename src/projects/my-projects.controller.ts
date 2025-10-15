import { Controller, Get } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';

@Controller('my/projects')
export class MyProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getMyProjects(@CurrentTenantId() tenantId: string, @CurrentSession() session: any) {
    const projects = await this.projectsService.getMyProjects(tenantId, session.userId);
    return {
      data: projects,
    };
  }
}
