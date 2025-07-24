import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSessionRequestSchema = z.object({
  title: z.string().min(2, 'Session title must be at least 2 characters'),
  description: z.string().optional().describe('Session description'),
  startTime: z
    .string()
    .datetime()
    .describe('Session start time (ISO datetime)'),
  endTime: z.string().datetime().describe('Session end time (ISO datetime)'),
  centerId: z.string().min(1, 'Center ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  teacherId: z.string().min(1, 'Teacher ID is required'),
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
  isRecurring: z
    .boolean()
    .default(false)
    .describe('Whether this is a recurring session'),
  recurrencePattern: z
    .string()
    .optional()
    .describe('Recurrence pattern (daily, weekly, monthly)'),
});

export class CreateSessionRequestDto extends createZodDto(
  CreateSessionRequestSchema,
) {}
