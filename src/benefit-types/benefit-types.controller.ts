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
import { BenefitTypesService } from './benefit-types.service';
import { CreateBenefitTypeDto, createBenefitTypeSchema } from './dto/create-benefit-type.dto';
import { UpdateBenefitTypeDto, updateBenefitTypeSchema } from './dto/update-benefit-type.dto';
import { QueryBenefitTypesDto, queryBenefitTypesSchema } from './dto/query-benefit-types.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('benefit-types')
export class BenefitTypesController {
  constructor(private readonly benefitTypesService: BenefitTypesService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(queryBenefitTypesSchema)) query: QueryBenefitTypesDto,
  ) {
    return this.benefitTypesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.benefitTypesService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createBenefitTypeSchema))
    createBenefitTypeDto: CreateBenefitTypeDto,
  ) {
    return this.benefitTypesService.create(createBenefitTypeDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBenefitTypeSchema))
    updateBenefitTypeDto: UpdateBenefitTypeDto,
  ) {
    return this.benefitTypesService.update(id, updateBenefitTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.benefitTypesService.remove(id);
  }
}
