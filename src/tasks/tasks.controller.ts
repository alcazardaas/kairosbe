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
import { TasksService } from './tasks.service';
import { CreateTaskDto, createTaskSchema } from './dto/create-task.dto';
import { UpdateTaskDto, updateTaskSchema } from './dto/update-task.dto';
import { QueryTasksDto, queryTasksSchema } from './dto/query-tasks.dto';
import {
  TaskResponseDto,
  TaskListResponseDto,
  CreateTaskRequestDto,
  UpdateTaskRequestDto,
} from './dto/task-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Tasks')
@ApiSecurity('session')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'List all tasks',
    description: 'Retrieve a paginated list of tasks with optional filtering and sorting.',
  })
  @ApiOkResponse({
    description: 'Tasks retrieved successfully',
    type: TaskListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findAll(@Query(new ZodValidationPipe(queryTasksSchema)) query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single task',
    description: 'Retrieve a task by its ID.',
  })
  @ApiOkResponse({
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new task',
    description:
      'Create a new task within a project. Can optionally specify a parent task for hierarchical tasks.',
  })
  @ApiCreatedResponse({
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid task data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(@Body(new ZodValidationPipe(createTaskSchema)) createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a task',
    description: 'Update an existing task by its ID.',
  })
  @ApiOkResponse({
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or validation error',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a task',
    description: 'Delete a task by its ID. This will cascade delete related data.',
  })
  @ApiNoContentResponse({
    description: 'Task deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
