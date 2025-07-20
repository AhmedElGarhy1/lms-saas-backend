import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from './query-attendance.dto';

export class UpdateAttendanceDto {
  @ApiProperty({
    description: 'Attendance ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
    required: false,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiProperty({
    description: 'Optional note about attendance',
    required: false,
    example: 'Student arrived 5 minutes late',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
