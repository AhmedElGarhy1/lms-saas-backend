import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../enums/day-of-week.enum';

export class ScheduleItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: DayOfWeek })
  day: DayOfWeek;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '17:00',
  })
  startTime: string;

  @ApiProperty({
    description:
      'End time in HH:mm format (computed from startTime + class duration)',
    example: '18:00',
    required: false,
  })
  endTime?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
