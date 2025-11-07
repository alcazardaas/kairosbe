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
import { BenefitTypesService } from './benefit-types.service';
import { CreateBenefitTypeDto, createBenefitTypeSchema } from './dto/create-benefit-type.dto';
import { UpdateBenefitTypeDto, updateBenefitTypeSchema } from './dto/update-benefit-type.dto';
import { QueryBenefitTypesDto, queryBenefitTypesSchema } from './dto/query-benefit-types.dto';
import {
  BenefitTypeResponseDto,
  BenefitTypeListResponseDto,
} from './dto/benefit-type-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';

@ApiTags('Benefit Types')
@ApiSecurity('session')
@Controller('benefit-types')
export class BenefitTypesController {
  constructor(private readonly benefitTypesService: BenefitTypesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all benefit types',
    description:
      'Retrieve a paginated list of benefit types (PTO, sick leave, etc.) with optional filtering.',
  })
  @ApiOkResponse({
    description: 'Benefit types retrieved successfully',
    type: BenefitTypeListResponseDto,
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
    @Query(new ZodValidationPipe(queryBenefitTypesSchema)) query: QueryBenefitTypesDto,
  ) {
    return this.benefitTypesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single benefit type',
    description: 'Retrieve a benefit type by its ID.',
  })
  @ApiOkResponse({
    description: 'Benefit type retrieved successfully',
    type: BenefitTypeResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Benefit type not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.benefitTypesService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new benefit type',
    description: 'Create a new benefit type (e.g., PTO, sick leave) for a tenant.',
  })
  @ApiCreatedResponse({
    description: 'Benefit type created successfully',
    type: BenefitTypeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid benefit type data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(
    @CurrentTenantId() tenantId: string,
    @Body(new ZodValidationPipe(createBenefitTypeSchema))
    createBenefitTypeDto: CreateBenefitTypeDto,
  ) {
    return this.benefitTypesService.create(tenantId, createBenefitTypeDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a benefit type',
    description: 'Update an existing benefit type by its ID.',
  })
  @ApiOkResponse({
    description: 'Benefit type updated successfully',
    type: BenefitTypeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or validation error',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Benefit type not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBenefitTypeSchema))
    updateBenefitTypeDto: UpdateBenefitTypeDto,
  ) {
    return this.benefitTypesService.update(tenantId, id, updateBenefitTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a benefit type',
    description: 'Delete a benefit type by its ID.',
  })
  @ApiNoContentResponse({
    description: 'Benefit type deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Benefit type not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async remove(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.benefitTypesService.remove(tenantId, id);
  }
}
