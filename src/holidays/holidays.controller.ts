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
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto, createHolidaySchema } from './dto/create-holiday.dto';
import { UpdateHolidayDto, updateHolidaySchema } from './dto/update-holiday.dto';
import { QueryHolidaysDto, queryHolidaysSchema } from './dto/query-holidays.dto';
import { HolidayResponseDto, HolidayListResponseDto } from './dto/holiday-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Holidays')
@ApiSecurity('session')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  @ApiOperation({
    summary: 'List all holidays',
    description: 'Retrieve a paginated list of holidays with optional filtering.',
  })
  @ApiOkResponse({
    description: 'Holidays retrieved successfully',
    type: HolidayListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findAll(@Query(new ZodValidationPipe(queryHolidaysSchema)) query: QueryHolidaysDto) {
    return this.holidaysService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single holiday',
    description: 'Retrieve a holiday by its ID.',
  })
  @ApiOkResponse({
    description: 'Holiday retrieved successfully',
    type: HolidayResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Holiday not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new holiday',
    description: 'Create a new holiday for a tenant.',
  })
  @ApiCreatedResponse({
    description: 'Holiday created successfully',
    type: HolidayResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid holiday data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(
    @Body(new ZodValidationPipe(createHolidaySchema)) createHolidayDto: CreateHolidayDto,
  ) {
    return this.holidaysService.create(createHolidayDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a holiday',
    description: 'Update an existing holiday by its ID.',
  })
  @ApiOkResponse({
    description: 'Holiday updated successfully',
    type: HolidayResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or validation error',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Holiday not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateHolidaySchema)) updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a holiday',
    description: 'Delete a holiday by its ID.',
  })
  @ApiNoContentResponse({
    description: 'Holiday deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Holiday not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
