import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '../enums/session-status.enum';

export class SessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Group ID' })
  groupId: string;

  @ApiPropertyOptional({ description: 'Schedule Item ID' })
  scheduleItemId?: string;

  @ApiPropertyOptional({ description: 'Session title/topic name' })
  title?: string;

  @ApiProperty({ description: 'Session start time' })
  startTime: Date;

  @ApiProperty({ description: 'Session end time' })
  endTime: Date;

  @ApiProperty({
    description: 'Session status',
    enum: SessionStatus,
  })
  status: SessionStatus;

  @ApiProperty({ description: 'Whether this is an extra/manual session' })
  isExtraSession: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  updatedBy?: string;
}
