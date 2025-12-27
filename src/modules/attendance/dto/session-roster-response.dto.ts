import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AttendanceStatus } from '../enums/attendance-status.enum';

export class SessionRosterStudentDto {
  @ApiProperty({ description: 'Student userProfileId' })
  @Expose()
  studentUserProfileId: string;

  @ApiProperty({ description: 'Student full name' })
  @Expose()
  fullName: string;

  @ApiProperty({ description: 'Student code (best-effort)', required: false })
  @Expose()
  studentCode?: string;

  @ApiProperty({ enum: AttendanceStatus, required: false })
  @Expose()
  attendanceStatus?: AttendanceStatus;

  @ApiProperty({
    description: 'Attendance record ID, if exists',
    required: false,
  })
  @Expose()
  attendanceId?: string;

  @ApiProperty({
    description: 'Whether it was marked manually',
    required: false,
  })
  @Expose()
  isManuallyMarked?: boolean;

  @ApiProperty({
    description: 'Last scanned time',
    required: false,
    type: Date,
  })
  @Expose()
  @Type(() => Date)
  lastScannedAt?: Date;
}

export class SessionRosterResponseDto {
  @ApiProperty({ description: 'Session ID' })
  @Expose()
  sessionId: string;

  @ApiProperty({ description: 'Group ID' })
  @Expose()
  groupId: string;

  @ApiProperty({ type: [SessionRosterStudentDto] })
  @Expose()
  @Type(() => SessionRosterStudentDto)
  students: SessionRosterStudentDto[];
}
