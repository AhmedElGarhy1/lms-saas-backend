import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AttendanceSessionIdParamDto {
  @ApiProperty({ description: 'Session ID (UUID)' })
  @IsUUID()
  sessionId: string;
}
