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
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto, createHolidaySchema } from './dto/create-holiday.dto';
import { UpdateHolidayDto, updateHolidaySchema } from './dto/update-holiday.dto';
import { QueryHolidaysDto, queryHolidaysSchema } from './dto/query-holidays.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(queryHolidaysSchema)) query: QueryHolidaysDto) {
    return this.holidaysService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createHolidaySchema)) createHolidayDto: CreateHolidayDto,
  ) {
    return this.holidaysService.create(createHolidayDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateHolidaySchema)) updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
