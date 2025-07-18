import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

class AttendanceMarkDto {
  @ApiProperty({ example: 'student-uuid', description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
    description: 'Attendance status',
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({
    example: 'Late due to traffic',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}

export class BulkMarkAttendanceDto {
  @ApiProperty({ example: 'session-uuid', description: 'Class session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({
    type: [AttendanceMarkDto],
    description: 'List of attendance marks',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceMarkDto)
  attendances: AttendanceMarkDto[];

  @ApiProperty({ example: 'user-uuid', description: 'User marking attendance' })
  @IsString()
  markedById: string;
}
