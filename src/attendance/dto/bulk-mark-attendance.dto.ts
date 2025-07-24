import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkMarkAttendanceRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  attendanceRecords: z
    .array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        status: z
          .enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
          .describe('Attendance status'),
        note: z
          .string()
          .optional()
          .describe('Additional notes about attendance'),
      }),
    )
    .min(1, 'At least one attendance record is required'),
  markedBy: z.string().min(1, 'User ID who marked the attendance').optional(),
});

export class BulkMarkAttendanceRequestDto extends createZodDto(
  BulkMarkAttendanceRequestSchema,
) {}
