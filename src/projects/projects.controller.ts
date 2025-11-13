import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, createProjectSchema } from './dto/create-project.dto';
import { UpdateProjectDto, updateProjectSchema } from './dto/update-project.dto';
import { QueryProjectsDto, queryProjectsSchema } from './dto/query-projects.dto';
import { AddMemberDto, addMemberSchema } from './dto/add-member.dto';
import { BulkAddMembersDto, bulkAddMembersSchema } from './dto/bulk-add-members.dto';
import {
  ProjectResponseDto,
  ProjectListResponseDto,
  ProjectMembersResponseDto,
  ProjectMemberResponseDto,
  CreateProjectRequestDto,
  UpdateProjectRequestDto,
  AddMemberRequestDto,
} from './dto/project-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Projects')
@ApiSecurity('session')
@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all projects',
    description: 'Retrieve a paginated list of projects with optional filtering and sorting.',
  })
  @ApiOkResponse({
    description: 'Projects retrieved successfully',
    type: ProjectListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query(new ZodValidationPipe(queryProjectsSchema)) query: QueryProjectsDto,
  ) {
    return this.projectsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single project',
    description: 'Retrieve a project by its ID.',
  })
  @ApiOkResponse({
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Create a new project within a tenant. Requires admin or manager role.',
  })
  @ApiCreatedResponse({
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid project data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin or manager role required.',
    type: ErrorResponseDto,
  })
  async create(
    @CurrentTenantId() tenantId: string,
    @Body(new ZodValidationPipe(createProjectSchema)) createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Update a project',
    description: 'Update an existing project by its ID. Requires admin or manager role.',
  })
  @ApiOkResponse({
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or validation error',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin or manager role required.',
    type: ErrorResponseDto,
  })
  async update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, updateProjectDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a project',
    description:
      'Delete a project by its ID. This will cascade delete related data. Requires admin role.',
  })
  @ApiNoContentResponse({
    description: 'Project deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin role required.',
    type: ErrorResponseDto,
  })
  async remove(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.remove(tenantId, id);
  }

  // ===== Project Membership Endpoints =====

  @Get(':id/members')
  @ApiOperation({
    summary: 'List project members',
    description: 'Retrieve all users assigned to a specific project.',
  })
  @ApiOkResponse({
    description: 'Project members retrieved successfully',
    type: ProjectMembersResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getMembers(@CurrentTenantId() tenantId: string, @Param('id') projectId: string) {
    const members = await this.projectsService.getMembers(tenantId, projectId);
    return {
      data: members,
    };
  }

  @Post(':id/members')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Add a member to a project',
    description:
      'Assign a user to a project with an optional role. Requires admin or manager role.',
  })
  @ApiCreatedResponse({
    description: 'Member added to project successfully',
    type: ProjectMemberResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user ID or member already exists',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin or manager role required.',
    type: ErrorResponseDto,
  })
  async addMember(
    @CurrentTenantId() tenantId: string,
    @Param('id') projectId: string,
    @Body(new ZodValidationPipe(addMemberSchema)) dto: AddMemberDto,
  ) {
    const member = await this.projectsService.addMember(tenantId, projectId, dto.userId, dto.role);
    return {
      data: member,
    };
  }

  @Delete(':id/members/:userId')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member from a project',
    description: 'Remove a user assignment from a project. Requires admin or manager role.',
  })
  @ApiNoContentResponse({
    description: 'Member removed from project successfully',
  })
  @ApiNotFoundResponse({
    description: 'Project or member not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin or manager role required.',
    type: ErrorResponseDto,
  })
  async removeMember(
    @CurrentTenantId() tenantId: string,
    @Param('id') projectId: string,
    @Param('userId') userId: string,
  ) {
    await this.projectsService.removeMember(tenantId, projectId, userId);
  }

  @Post(':id/members/bulk')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Bulk add members to a project',
    description: 'Assign multiple users to a project at once. Requires admin or manager role.',
  })
  @ApiCreatedResponse({
    description: 'Bulk operation completed. Returns success and failure details.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin or manager role required.',
    type: ErrorResponseDto,
  })
  async bulkAddMembers(
    @CurrentTenantId() tenantId: string,
    @Param('id') projectId: string,
    @Body(new ZodValidationPipe(bulkAddMembersSchema)) dto: BulkAddMembersDto,
  ) {
    const results = await this.projectsService.bulkAddMembers(
      tenantId,
      projectId,
      dto.userIds,
      dto.role,
    );
    return {
      data: results,
      summary: {
        total: dto.userIds.length,
        succeeded: results.success.length,
        failed: results.failed.length,
      },
    };
  }
}
