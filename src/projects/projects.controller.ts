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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, createProjectSchema } from './dto/create-project.dto';
import { UpdateProjectDto, updateProjectSchema } from './dto/update-project.dto';
import { QueryProjectsDto, queryProjectsSchema } from './dto/query-projects.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(queryProjectsSchema))
  async findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createProjectSchema)) createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(createProjectDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
