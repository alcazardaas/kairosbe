import { ApiProperty } from '@nestjs/swagger';

class ValidationError {
  @ApiProperty()
  type: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  dayOfWeek?: number;

  @ApiProperty({ required: false })
  date?: string;

  @ApiProperty({ required: false })
  hours?: number;

  @ApiProperty({ required: false })
  maxAllowed?: number;
}

class ValidationSummary {
  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  daysWithEntries: number;

  @ApiProperty()
  entryCount: number;

  @ApiProperty()
  projectCount: number;

  @ApiProperty()
  status: string;
}

export class TimesheetValidationResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ type: [ValidationError] })
  errors: ValidationError[];

  @ApiProperty({ type: [ValidationError] })
  warnings: ValidationError[];

  @ApiProperty()
  summary: ValidationSummary;
}

export class RecallTimesheetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  previousStatus: string;

  @ApiProperty()
  recalledAt: Date;

  @ApiProperty()
  recalledByUserId: string;
}
