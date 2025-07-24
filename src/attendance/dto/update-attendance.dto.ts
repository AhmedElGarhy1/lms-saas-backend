import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateAttendanceRequestSchema = z.object({
  status: z
    .enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
    .optional()
    .describe('Attendance status'),
  note: z.string().optional().describe('Additional notes about attendance'),
});

export class UpdateAttendanceRequestDto extends createZodDto(
  UpdateAttendanceRequestSchema,
) {}
