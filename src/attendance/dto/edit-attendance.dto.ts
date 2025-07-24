import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const EditAttendanceRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  status: z
    .enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
    .describe('Attendance status'),
  note: z.string().optional().describe('Additional notes about attendance'),
});

export class EditAttendanceRequestDto extends createZodDto(
  EditAttendanceRequestSchema,
) {}
