import { ApiProperty } from '@nestjs/swagger';
import { ScheduleItemResponseDto } from './schedule-item-response.dto';

export class GroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  classId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  centerId: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [ScheduleItemResponseDto], required: false })
  scheduleItems?: ScheduleItemResponseDto[];

  @ApiProperty({ required: false })
  class?: any;

  @ApiProperty({ required: false })
  groupStudents?: any[];
}
