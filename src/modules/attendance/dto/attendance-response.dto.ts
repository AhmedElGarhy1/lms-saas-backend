import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AttendanceStatus } from '../enums/attendance-status.enum';

export class AttendanceStudentCardDto {
  @ApiProperty({ description: 'Student userProfileId' })
  @Expose()
  studentUserProfileId: string;

  @ApiProperty({ description: 'Student full name' })
  @Expose()
  fullName: string;

  @ApiProperty({ description: 'Student code (best-effort)', required: false })
  @Expose()
  studentCode?: string;

  @ApiProperty({
    description: 'Student photo URL (reserved for future)',
    required: false,
  })
  @Expose()
  photoUrl?: string;
}

export class AttendanceResponseDto {
  @ApiProperty({ description: 'Attendance record ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Session ID' })
  @Expose()
  sessionId: string;

  @ApiProperty({ description: 'Group ID' })
  @Expose()
  groupId: string;

  @ApiProperty({ description: 'Student userProfileId' })
  @Expose()
  studentUserProfileId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @Expose()
  status: AttendanceStatus;

  @ApiProperty({ description: 'Whether it was marked manually' })
  @Expose()
  isManuallyMarked: boolean;

  // TODO: remove this we already have createdBy and updatedBy
  @ApiProperty({
    description: 'Marked by staff userProfileId',
    required: false,
  })
  @Expose()
  markedByUserProfileId?: string;

  @ApiProperty({ description: 'Student identity card info' })
  @Expose()
  @Type(() => AttendanceStudentCardDto)
  student: AttendanceStudentCardDto;
}
