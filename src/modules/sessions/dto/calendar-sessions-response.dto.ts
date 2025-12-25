import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../enums/session-status.enum';

/**
 * Calendar session item with nested relations
 */
export class CalendarSessionItem {
  @ApiProperty({ description: 'Session ID', example: 'uuid' })
  id?: string;

  @ApiProperty({
    description: 'Session title',
    example: 'Session Title',
  })
  title: string;

  @ApiProperty({
    description: 'Session start time (ISO 8601)',
    example: '2024-01-15T09:00:00Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'Session end time (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  endTime: string;

  @ApiProperty({
    description: 'Session status',
    enum: SessionStatus,
    example: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @ApiProperty({ description: 'Group ID', example: 'uuid' })
  groupId: string;

  @ApiProperty({
    description: 'Whether this is an extra session',
    example: false,
  })
  isExtraSession: boolean;

  @ApiProperty({
    description: 'Actual start time',
    example: '2024-01-15T09:00:00Z',
  })
  actualStartTime?: Date;

  @ApiProperty({
    description: 'Actual finish time',
    example: '2024-01-15T10:30:00Z',
  })
  actualFinishTime?: Date;
}

/**
 * Meta information for calendar response
 */
export class CalendarMeta {
  @ApiProperty({
    description: 'Total number of items in the date range',
    example: 45,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Items per page (always 1000 for calendar)',
    example: 1000,
  })
  itemsPerPage: number;

  @ApiProperty({
    description: 'Total pages (always 1 for calendar)',
    example: 1,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Current page (always 1 for calendar)',
    example: 1,
  })
  currentPage: number;
}

/**
 * Calendar sessions response DTO
 */
export class CalendarSessionsResponseDto {
  @ApiProperty({
    description: 'Array of calendar session items',
    type: [CalendarSessionItem],
  })
  items: CalendarSessionItem[];

  @ApiProperty({
    description: 'Meta information',
    type: CalendarMeta,
  })
  meta: CalendarMeta;
}
