import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Session Response Schema
export const SessionResponseSchema = z.object({
  id: z.string().describe('Session ID'),
  title: z.string().describe('Session title'),
  description: z.string().optional().describe('Session description'),
  startTime: z.date().describe('Session start time'),
  endTime: z.date().describe('Session end time'),
  centerId: z.string().describe('Center ID'),
  subjectId: z.string().optional().describe('Subject ID'),
  teacherId: z.string().describe('Teacher ID'),
  groupId: z.string().optional().describe('Group ID'),
  maxStudents: z.number().optional().describe('Maximum number of students'),
  location: z.string().optional().describe('Session location'),
  isRecurring: z.boolean().describe('Whether this is a recurring session'),
  recurrencePattern: z.string().optional().describe('Recurrence pattern'),
  isCancelled: z.boolean().describe('Whether the session is cancelled'),
  createdAt: z.date().describe('Session creation timestamp'),
  updatedAt: z.date().describe('Session last update timestamp'),
  teacher: z
    .object({
      id: z.string().describe('Teacher ID'),
      name: z.string().describe('Teacher name'),
      email: z.string().email().describe('Teacher email'),
    })
    .optional()
    .describe('Teacher information'),
  subject: z
    .object({
      id: z.string().describe('Subject ID'),
      name: z.string().describe('Subject name'),
      code: z.string().describe('Subject code'),
    })
    .optional()
    .describe('Subject information'),
  group: z
    .object({
      id: z.string().describe('Group ID'),
      name: z.string().describe('Group name'),
    })
    .optional()
    .describe('Group information'),
  center: z
    .object({
      id: z.string().describe('Center ID'),
      name: z.string().describe('Center name'),
    })
    .optional()
    .describe('Center information'),
});

// Session List Response Schema
export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionResponseSchema).describe('List of sessions'),
  total: z.number().describe('Total number of sessions'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Session Response Schema
export const CreateSessionResponseSchema = z.object({
  message: z.string().describe('Success message'),
  session: SessionResponseSchema.describe('Created session information'),
});

// Update Session Response Schema
export const UpdateSessionResponseSchema = z.object({
  message: z.string().describe('Success message'),
  session: SessionResponseSchema.describe('Updated session information'),
});

// Session Stats Response Schema
export const SessionStatsResponseSchema = z.object({
  totalSessions: z.number().describe('Total number of sessions'),
  upcomingSessions: z.number().describe('Number of upcoming sessions'),
  completedSessions: z.number().describe('Number of completed sessions'),
  cancelledSessions: z.number().describe('Number of cancelled sessions'),
  averageAttendance: z.number().describe('Average attendance rate'),
});

// Create DTOs using nestjs-zod
export class SessionResponseDto extends createZodDto(SessionResponseSchema) {}
export class SessionListResponseDto extends createZodDto(
  SessionListResponseSchema,
) {}
export class CreateSessionResponseDto extends createZodDto(
  CreateSessionResponseSchema,
) {}
export class UpdateSessionResponseDto extends createZodDto(
  UpdateSessionResponseSchema,
) {}
export class SessionStatsResponseDto extends createZodDto(
  SessionStatsResponseSchema,
) {}
