import { ApiProperty } from '@nestjs/swagger';

class ProjectInfo {
  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectCode: string;

  @ApiProperty()
  hours: number;
}

class ProjectBreakdownItem {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectCode: string;

  @ApiProperty()
  totalHours: number;
}

class WeekTimeEntry {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectCode: string;

  @ApiProperty({ required: false })
  taskId: string | null;

  @ApiProperty({ required: false })
  taskName: string | null;

  @ApiProperty()
  dayOfWeek: number;

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
  submittedAt: Date | null;

  @ApiProperty({ required: false })
  reviewedAt: Date | null;

  @ApiProperty({ required: false })
  reviewNote: string | null;
}

export class WeekViewResponseDto {
  @ApiProperty()
  weekStartDate: string;

  @ApiProperty()
  weekEndDate: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [WeekTimeEntry] })
  entries: WeekTimeEntry[];

  @ApiProperty({ type: [Number] })
  dailyTotals: number[];

  @ApiProperty()
  weeklyTotal: number;

  @ApiProperty()
  byProject: Record<string, ProjectInfo>;

  @ApiProperty({ type: [ProjectBreakdownItem] })
  projectBreakdown: ProjectBreakdownItem[];

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
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    totalRequested: number;
  };
}

export class CopyWeekResponseDto {
  @ApiProperty()
  copiedCount: number;

  @ApiProperty()
  skippedCount: number;

  @ApiProperty()
  overwrittenCount: number;

  @ApiProperty()
  entries: any[];

  @ApiProperty()
  skipped: any[];
}
