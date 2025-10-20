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
  UsePipes,
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
  ApiSecurity,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, createProjectSchema } from './dto/create-project.dto';
import { UpdateProjectDto, updateProjectSchema } from './dto/update-project.dto';
import { QueryProjectsDto, queryProjectsSchema } from './dto/query-projects.dto';
import { AddMemberDto, addMemberSchema } from './dto/add-member.dto';
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

@ApiTags('Projects')
@ApiSecurity('session')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(queryProjectsSchema))
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
  async findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
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
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Create a new project within a tenant.',
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
  async create(
    @Body(new ZodValidationPipe(createProjectSchema)) createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(createProjectDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a project',
    description: 'Update an existing project by its ID.',
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
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a project',
    description: 'Delete a project by its ID. This will cascade delete related data.',
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
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
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
  @UsePipes(new ZodValidationPipe(addMemberSchema))
  @ApiOperation({
    summary: 'Add a member to a project',
    description: 'Assign a user to a project with an optional role.',
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
  async addMember(
    @CurrentTenantId() tenantId: string,
    @Param('id') projectId: string,
    @Body() dto: AddMemberDto,
  ) {
    const member = await this.projectsService.addMember(tenantId, projectId, dto.userId, dto.role);
    return {
      data: member,
    };
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member from a project',
    description: 'Remove a user assignment from a project.',
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
  async removeMember(
    @CurrentTenantId() tenantId: string,
    @Param('id') projectId: string,
    @Param('userId') userId: string,
  ) {
    await this.projectsService.removeMember(tenantId, projectId, userId);
  }
}
