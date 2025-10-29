import { ApiProperty } from '@nestjs/swagger';

class ProjectInfo {
  @ApiProperty()
  project_name: string;

  @ApiProperty()
  project_code: string;

  @ApiProperty()
  hours: number;
}

class WeekTimeEntry {
  @ApiProperty()
  id: string;

  @ApiProperty()
  project_id: string;

  @ApiProperty()
  project_name: string;

  @ApiProperty()
  project_code: string;

  @ApiProperty({ required: false })
  task_id: string | null;

  @ApiProperty({ required: false })
  task_name: string | null;

  @ApiProperty()
  day_of_week: number;

  @ApiProperty()
  date: string;

  @ApiProperty()
  hours: number;

  @ApiProperty({ required: false })
  note: string | null;
}

class TimesheetInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  submitted_at: Date | null;

  @ApiProperty({ required: false })
  reviewed_at: Date | null;
}

export class WeekViewResponseDto {
  @ApiProperty()
  week_start_date: string;

  @ApiProperty()
  week_end_date: string;

  @ApiProperty({ type: [WeekTimeEntry] })
  entries: WeekTimeEntry[];

  @ApiProperty({ type: [Number] })
  daily_totals: number[];

  @ApiProperty()
  weekly_total: number;

  @ApiProperty()
  by_project: Record<string, ProjectInfo>;

  @ApiProperty({ required: false })
  timesheet: TimesheetInfo | null;
}

export class BulkTimeEntryResultDto {
  @ApiProperty()
  created: any[];

  @ApiProperty()
  updated: any[];

  @ApiProperty()
  errors: any[];

  @ApiProperty()
  summary: {
    created_count: number;
    updated_count: number;
    error_count: number;
    total_requested: number;
  };
}

export class CopyWeekResponseDto {
  @ApiProperty()
  copied_count: number;

  @ApiProperty()
  skipped_count: number;

  @ApiProperty()
  overwritten_count: number;

  @ApiProperty()
  entries: any[];

  @ApiProperty()
  skipped: any[];
}
