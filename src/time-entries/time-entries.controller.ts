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
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto, createTimeEntrySchema } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto, updateTimeEntrySchema } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto, queryTimeEntriesSchema } from './dto/query-time-entries.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(queryTimeEntriesSchema)) query: QueryTimeEntriesDto) {
    return this.timeEntriesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.timeEntriesService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createTimeEntrySchema)) createTimeEntryDto: CreateTimeEntryDto,
  ) {
    return this.timeEntriesService.create(createTimeEntryDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTimeEntrySchema)) updateTimeEntryDto: UpdateTimeEntryDto,
  ) {
    return this.timeEntriesService.update(id, updateTimeEntryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.timeEntriesService.remove(id);
  }

  @Get('stats/weekly/:userId/:weekStartDate')
  async getWeeklyHours(
    @Param('userId') userId: string,
    @Param('weekStartDate') weekStartDate: string,
  ) {
    const total = await this.timeEntriesService.getWeeklyHours(userId, weekStartDate);
    return { userId, weekStartDate, totalHours: total };
  }

  @Get('stats/project/:projectId')
  async getProjectHours(@Param('projectId') projectId: string) {
    const total = await this.timeEntriesService.getProjectHours(projectId);
    return { projectId, totalHours: total };
  }
}
