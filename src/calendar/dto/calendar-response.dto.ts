import { ApiProperty } from '@nestjs/swagger';

// ===== Entity DTOs =====

export class CalendarHolidayDto {
  @ApiProperty({
    description: 'Item type',
    example: 'holiday',
    enum: ['holiday'],
  })
  type: 'holiday';

  @ApiProperty({
    description: 'Holiday ID',
    example: '123e4567-e89b-12d3-a456-426614174060',
  })
  id: string;

  @ApiProperty({
    description: 'Holiday name',
    example: 'New Year\'s Day',
  })
  name: string;

  @ApiProperty({
    description: 'Holiday date',
    example: '2025-01-01',
  })
  date: string;
}

export class CalendarLeaveDto {
  @ApiProperty({
    description: 'Item type',
    example: 'leave',
    enum: ['leave'],
  })
  type: 'leave';

  @ApiProperty({
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174040',
  })
  id: string;

  @ApiProperty({
    description: 'Benefit type name',
    example: 'Paid Time Off',
  })
  benefitTypeName: string;

  @ApiProperty({
    description: 'Leave start date',
    example: '2025-02-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Leave end date',
    example: '2025-02-05',
  })
  endDate: string;

  @ApiProperty({
    description: 'Request status',
    example: 'approved',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Amount of benefit used',
    example: 5.0,
  })
  amount: number;
}

export class CalendarTimesheetDto {
  @ApiProperty({
    description: 'Item type',
    example: 'timesheet',
    enum: ['timesheet'],
  })
  type: 'timesheet';

  @ApiProperty({
    description: 'Timesheet ID',
    example: '123e4567-e89b-12d3-a456-426614174020',
  })
  id: string;

  @ApiProperty({
    description: 'Week start date',
    example: '2025-01-20',
  })
  weekStartDate: string;

  @ApiProperty({
    description: 'Timesheet status',
    example: 'approved',
    enum: ['draft', 'pending', 'approved', 'rejected'],
  })
  status: string;

  @ApiProperty({
    description: 'Total hours for the week',
    example: 40.0,
    required: false,
  })
  totalHours?: number;
}

export class CalendarMetaDto {
  @ApiProperty({
    description: 'User ID for this calendar',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Start date filter',
    example: '2025-01-01',
  })
  from: string;

  @ApiProperty({
    description: 'End date filter',
    example: '2025-12-31',
  })
  to: string;

  @ApiProperty({
    description: 'Included item types',
    example: ['holidays', 'leave', 'timesheets'],
    type: [String],
  })
  include: string[];
}

// ===== Response DTOs =====

export class CalendarResponseDto {
  @ApiProperty({
    description: 'Array of calendar items (holidays, leave requests, timesheets)',
    type: Array,
    isArray: true,
  })
  data: (CalendarHolidayDto | CalendarLeaveDto | CalendarTimesheetDto)[];

  @ApiProperty({
    description: 'Calendar metadata',
    type: CalendarMetaDto,
  })
  meta: CalendarMetaDto;
}
