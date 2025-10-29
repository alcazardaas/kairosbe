import { ApiProperty } from '@nestjs/swagger';

class ValidationError {
  @ApiProperty()
  type: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  day_of_week?: number;

  @ApiProperty({ required: false })
  date?: string;

  @ApiProperty({ required: false })
  hours?: number;

  @ApiProperty({ required: false})
  max_allowed?: number;
}

class ValidationSummary {
  @ApiProperty()
  total_hours: number;

  @ApiProperty()
  days_with_entries: number;

  @ApiProperty()
  entry_count: number;

  @ApiProperty()
  project_count: number;

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
  previous_status: string;

  @ApiProperty()
  recalled_at: Date;

  @ApiProperty()
  recalled_by_user_id: string;
}
