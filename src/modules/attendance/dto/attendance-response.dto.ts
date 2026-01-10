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

  @ApiProperty({ description: 'Student identity card info' })
  @Expose()
  @Type(() => AttendanceStudentCardDto)
  student: AttendanceStudentCardDto;

  @ApiProperty({
    description: 'Payment status for outstanding class installments',
    required: false,
    example: {
      hasOutstandingInstallments: true,
      outstandingAmount: 500.0,
      totalAmount: 2000.0,
      progress: 75.0,
    },
  })
  @Expose()
  paymentStatus?: {
    hasOutstandingInstallments: boolean;
    outstandingAmount: number;
    totalAmount: number;
    progress: number;
  };
}
