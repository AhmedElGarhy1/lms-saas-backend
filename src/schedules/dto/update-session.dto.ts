import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateSessionRequestSchema = z.object({
  title: z
    .string()
    .min(2, 'Session title must be at least 2 characters')
    .optional(),
  description: z.string().optional().describe('Session description'),
  startTime: z
    .string()
    .datetime()
    .optional()
    .describe('Session start time (ISO datetime)'),
  endTime: z
    .string()
    .datetime()
    .optional()
    .describe('Session end time (ISO datetime)'),
  subjectId: z.string().min(1, 'Subject ID is required').optional(),
  teacherId: z.string().min(1, 'Teacher ID is required').optional(),
  groupId: z
    .string()
    .optional()
    .describe('Group ID (optional for individual sessions)'),
  maxStudents: z
    .number()
    .min(1)
    .optional()
    .describe('Maximum number of students'),
  location: z.string().optional().describe('Session location'),
  isCancelled: z
    .boolean()
    .optional()
    .describe('Whether the session is cancelled'),
  recurrencePattern: z
    .string()
    .optional()
    .describe('Recurrence pattern (daily, weekly, monthly)'),
});

export class UpdateSessionRequestDto extends createZodDto(
  UpdateSessionRequestSchema,
) {}
