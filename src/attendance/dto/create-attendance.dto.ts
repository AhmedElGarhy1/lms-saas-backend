import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from './query-attendance.dto';

export const CreateAttendanceRequestSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().optional(),
});
export type CreateAttendanceRequest = z.infer<
  typeof CreateAttendanceRequestSchema
>;

export class CreateAttendanceRequestDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Student ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  studentId: string;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @ApiProperty({
    description: 'Optional note about attendance',
    required: false,
    example: 'Student arrived 5 minutes late',
  })
  note?: string;
}
