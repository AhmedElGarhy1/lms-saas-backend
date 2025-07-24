import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Student Response Schema (User-Centric)
export const StudentResponseSchema = z.object({
  id: z.string().describe('User ID'),
  email: z.string().email().describe('User email'),
  name: z.string().describe('User name'),
  isActive: z.boolean().describe('User active status'),
  createdAt: z.date().describe('User creation timestamp'),
  updatedAt: z.date().describe('User last update timestamp'),
  profile: z
    .object({
      id: z.string().describe('Profile ID'),
      type: z
        .enum(['TEACHER', 'STUDENT', 'GUARDIAN', 'BASE_USER'])
        .describe('Profile type'),
      student: z
        .object({
          id: z.string().describe('Student profile ID'),
          grade: z
            .enum([
              'PRIMARY_1',
              'PRIMARY_2',
              'PRIMARY_3',
              'PRIMARY_4',
              'PRIMARY_5',
              'PRIMARY_6',
              'SECONDARY_1',
              'SECONDARY_2',
              'SECONDARY_3',
              'SECONDARY_4',
              'SECONDARY_5',
              'OTHER',
            ])
            .describe('Student grade'),
          level: z.string().optional().describe('Student level'),
          performanceScore: z.number().optional().describe('Performance score'),
          totalSessionsAttended: z.number().describe('Total sessions attended'),
          totalPayments: z.number().describe('Total payments made'),
          notes: z.string().optional().describe('Additional notes'),
          gradeLevelId: z.string().optional().describe('Grade level ID'),
          createdAt: z.date().describe('Student profile creation timestamp'),
          updatedAt: z.date().describe('Student profile last update timestamp'),
        })
        .optional()
        .describe('Student profile data'),
    })
    .optional()
    .describe('User profile information'),
});

// Student List Response Schema
export const StudentListResponseSchema = z.object({
  students: z.array(StudentResponseSchema).describe('List of students'),
  total: z.number().describe('Total number of students'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Student Response Schema
export const CreateStudentResponseSchema = z.object({
  message: z.string().describe('Success message'),
  student: StudentResponseSchema.describe('Created student information'),
});

// Update Student Response Schema
export const UpdateStudentResponseSchema = z.object({
  message: z.string().describe('Success message'),
  student: StudentResponseSchema.describe('Updated student information'),
});

// Student Stats Response Schema
export const StudentStatsResponseSchema = z.object({
  totalStudents: z.number().describe('Total number of students'),
  activeStudents: z.number().describe('Number of active students'),
  inactiveStudents: z.number().describe('Number of inactive students'),
  averagePerformanceScore: z.number().describe('Average performance score'),
  totalSessionsAttended: z
    .number()
    .describe('Total sessions attended across all students'),
  totalPayments: z.number().describe('Total payments across all students'),
});

// Add Student to Center Response Schema
export const AddStudentToCenterResponseSchema = z.object({
  message: z.string().describe('Success message'),
  student: StudentResponseSchema.describe('Student information'),
  centerAccess: z
    .object({
      userId: z.string().describe('User ID'),
      centerId: z.string().describe('Center ID'),
      roleId: z.string().describe('Role ID'),
      isActive: z.boolean().describe('Access active status'),
      createdAt: z.date().describe('Access creation timestamp'),
    })
    .describe('Center access information'),
});

// Create DTOs using nestjs-zod
export class StudentResponseDto extends createZodDto(StudentResponseSchema) {}
export class StudentListResponseDto extends createZodDto(
  StudentListResponseSchema,
) {}
export class CreateStudentResponseDto extends createZodDto(
  CreateStudentResponseSchema,
) {}
export class UpdateStudentResponseDto extends createZodDto(
  UpdateStudentResponseSchema,
) {}
export class StudentStatsResponseDto extends createZodDto(
  StudentStatsResponseSchema,
) {}
export class AddStudentToCenterResponseDto extends createZodDto(
  AddStudentToCenterResponseSchema,
) {}
