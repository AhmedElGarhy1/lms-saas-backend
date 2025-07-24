import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Attendance Status Enum
export const AttendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
]);

// Attendance Response Schema
export const AttendanceResponseSchema = z.object({
  id: z.string().describe('Attendance ID'),
  sessionId: z.string().describe('Session ID'),
  studentId: z.string().describe('Student ID'),
  status: AttendanceStatusEnum.describe('Attendance status'),
  note: z.string().optional().describe('Additional notes about attendance'),
  markedBy: z.string().optional().describe('User ID who marked the attendance'),
  createdAt: z.date().describe('Attendance creation timestamp'),
  updatedAt: z.date().describe('Attendance last update timestamp'),
  session: z
    .object({
      id: z.string().describe('Session ID'),
      title: z.string().describe('Session title'),
      startTime: z.date().describe('Session start time'),
      endTime: z.date().describe('Session end time'),
    })
    .optional()
    .describe('Session information'),
  student: z
    .object({
      id: z.string().describe('Student ID'),
      name: z.string().describe('Student name'),
      email: z.string().email().describe('Student email'),
    })
    .optional()
    .describe('Student information'),
});

// Attendance List Response Schema
export const AttendanceListResponseSchema = z.object({
  attendances: z
    .array(AttendanceResponseSchema)
    .describe('List of attendance records'),
  total: z.number().describe('Total number of attendance records'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Attendance Response Schema
export const CreateAttendanceResponseSchema = z.object({
  message: z.string().describe('Success message'),
  attendance: AttendanceResponseSchema.describe(
    'Created attendance information',
  ),
});

// Update Attendance Response Schema
export const UpdateAttendanceResponseSchema = z.object({
  message: z.string().describe('Success message'),
  attendance: AttendanceResponseSchema.describe(
    'Updated attendance information',
  ),
});

// Bulk Mark Attendance Response Schema
export const BulkMarkAttendanceResponseSchema = z.object({
  message: z.string().describe('Success message'),
  created: z.number().describe('Number of attendance records created'),
  updated: z.number().describe('Number of attendance records updated'),
  attendances: z
    .array(AttendanceResponseSchema)
    .describe('List of created/updated attendance records'),
});

// Attendance Report Response Schema
export const AttendanceReportResponseSchema = z.object({
  totalSessions: z.number().describe('Total number of sessions'),
  totalStudents: z.number().describe('Total number of students'),
  totalAttendanceRecords: z
    .number()
    .describe('Total number of attendance records'),
  presentCount: z.number().describe('Number of present records'),
  absentCount: z.number().describe('Number of absent records'),
  lateCount: z.number().describe('Number of late records'),
  excusedCount: z.number().describe('Number of excused records'),
  attendanceRate: z.number().describe('Overall attendance rate (percentage)'),
  period: z
    .object({
      startDate: z.date().describe('Report start date'),
      endDate: z.date().describe('Report end date'),
    })
    .describe('Report period'),
});

// Create DTOs using nestjs-zod
export class AttendanceResponseDto extends createZodDto(
  AttendanceResponseSchema,
) {}
export class AttendanceListResponseDto extends createZodDto(
  AttendanceListResponseSchema,
) {}
export class CreateAttendanceResponseDto extends createZodDto(
  CreateAttendanceResponseSchema,
) {}
export class UpdateAttendanceResponseDto extends createZodDto(
  UpdateAttendanceResponseSchema,
) {}
export class BulkMarkAttendanceResponseDto extends createZodDto(
  BulkMarkAttendanceResponseSchema,
) {}
export class AttendanceReportResponseDto extends createZodDto(
  AttendanceReportResponseSchema,
) {}

// Export enum for backward compatibility
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}
