import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  teacherId: string;

  @ApiPropertyOptional()
  centerId?: string;

  @ApiPropertyOptional()
  groupId?: string;

  @ApiPropertyOptional()
  subjectId?: string;

  @ApiPropertyOptional()
  grade?: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiPropertyOptional()
  recurrenceRule?: string;

  @ApiProperty()
  isCancelled: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: Object })
  teacher?: any;

  @ApiPropertyOptional({ type: Object })
  center?: any;

  @ApiPropertyOptional({ type: Object })
  group?: any;

  @ApiPropertyOptional({ type: Object })
  subject?: any;
}
