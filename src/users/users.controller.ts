import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { QueryUsersDto, queryUsersSchema } from './dto/query-users.dto';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto';
import { UpdateUserDto, updateUserSchema } from './dto/update-user.dto';
import {
  UserListResponseDto,
  UserResponseDto,
  CreateUserRequestDto,
  UpdateUserRequestDto,
} from './dto/user-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CurrentTenantId,
  CurrentUser,
  CurrentSession,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Users')
@ApiSecurity('session')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'List all users/employees',
    description:
      'Retrieve a paginated list of users within the tenant. Supports filtering by role, status, manager, and search query. Only accessible by admins and managers.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort field and direction (e.g., "name:asc", "created_at:desc")',
    example: 'name:asc',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search by name or email',
    example: 'john',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['admin', 'manager', 'employee'],
    description: 'Filter by role',
    example: 'employee',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'invited', 'disabled'],
    description: 'Filter by membership status',
    example: 'active',
  })
  @ApiQuery({
    name: 'manager_id',
    required: false,
    description: 'Filter by manager ID (shows direct reports)',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiOkResponse({
    description: 'Users retrieved successfully',
    type: UserListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Only admins and managers can access this endpoint.',
    type: ErrorResponseDto,
  })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query(new ZodValidationPipe(queryUsersSchema)) query: QueryUsersDto,
  ) {
    return this.usersService.findAll(tenantId, query);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Create or invite a user',
    description:
      'Create a new user or invite an existing user to the tenant. Sets status to "invited" and optionally sends an invitation email. Accessible by admins and managers only.',
  })
  @ApiCreatedResponse({
    description: 'User created/invited successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user data, validation error, or circular manager reference',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Only admins and managers can create users.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'User is already a member of this tenant',
    type: ErrorResponseDto,
  })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, dto, session.userId);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Update a user',
    description:
      'Update user details including name, role, and profile information. Supports partial updates. Users cannot change their own role. Validates circular manager references. Accessible by admins and managers only.',
  })
  @ApiOkResponse({
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data, validation error, or circular manager reference',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Cannot change own role.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found in this tenant',
    type: ErrorResponseDto,
  })
  async update(
    @CurrentTenantId() tenantId: string,
    @Param('id') userId: string,
    @CurrentSession() session: any,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, userId, dto, session.userId);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate a user',
    description:
      'Soft delete a user by setting their membership status to "disabled". Admins can deactivate any user. Managers can only deactivate their direct reports. Users cannot deactivate themselves.',
  })
  @ApiNoContentResponse({
    description: 'User deactivated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid user ID',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Cannot deactivate own account or non-direct reports.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found in this tenant',
    type: ErrorResponseDto,
  })
  async delete(
    @CurrentTenantId() tenantId: string,
    @Param('id') userId: string,
    @CurrentSession() session: any,
  ) {
    await this.usersService.delete(tenantId, userId, session.userId);
  }
}
