import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export class EditAttendanceDto {
  @ApiProperty({
    example: 'attendance-uuid',
    description: 'Attendance record ID',
  })
  @IsString()
  id: string;

  @ApiProperty({
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
    description: 'Attendance status',
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ example: 'Updated note', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}
