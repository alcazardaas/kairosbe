import { Module } from '@nestjs/common';
import { BenefitTypesController } from './benefit-types.controller';
import { BenefitTypesService } from './benefit-types.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [BenefitTypesController],
  providers: [BenefitTypesService],
  exports: [BenefitTypesService],
})
export class BenefitTypesModule {}
