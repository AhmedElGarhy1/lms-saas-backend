import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Teacher Response Schema (User-Centric)
export const TeacherResponseSchema = z.object({
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
      teacher: z
        .object({
          id: z.string().describe('Teacher profile ID'),
          biography: z.string().optional().describe('Teacher biography'),
          experienceYears: z
            .number()
            .optional()
            .describe('Years of teaching experience'),
          specialization: z
            .string()
            .optional()
            .describe('Teacher specialization'),
          profileViews: z.number().describe('Number of profile views'),
          rating: z.number().describe('Teacher rating'),
          studentsCount: z.number().describe('Number of students'),
          centersCount: z.number().describe('Number of centers'),
          createdAt: z.date().describe('Teacher profile creation timestamp'),
          updatedAt: z.date().describe('Teacher profile last update timestamp'),
        })
        .optional()
        .describe('Teacher profile data'),
    })
    .optional()
    .describe('User profile information'),
});

// Teacher List Response Schema
export const TeacherListResponseSchema = z.object({
  teachers: z.array(TeacherResponseSchema).describe('List of teachers'),
  total: z.number().describe('Total number of teachers'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Teacher Response Schema
export const CreateTeacherResponseSchema = z.object({
  message: z.string().describe('Success message'),
  teacher: TeacherResponseSchema.describe('Created teacher information'),
});

// Update Teacher Response Schema
export const UpdateTeacherResponseSchema = z.object({
  message: z.string().describe('Success message'),
  teacher: TeacherResponseSchema.describe('Updated teacher information'),
});

// Teacher Stats Response Schema
export const TeacherStatsResponseSchema = z.object({
  totalTeachers: z.number().describe('Total number of teachers'),
  activeTeachers: z.number().describe('Number of active teachers'),
  inactiveTeachers: z.number().describe('Number of inactive teachers'),
  averageRating: z.number().describe('Average teacher rating'),
  totalStudents: z
    .number()
    .describe('Total number of students across all teachers'),
  totalCenters: z
    .number()
    .describe('Total number of centers across all teachers'),
});

// Create DTOs using nestjs-zod
export class TeacherResponseDto extends createZodDto(TeacherResponseSchema) {}
export class TeacherListResponseDto extends createZodDto(
  TeacherListResponseSchema,
) {}
export class CreateTeacherResponseDto extends createZodDto(
  CreateTeacherResponseSchema,
) {}
export class UpdateTeacherResponseDto extends createZodDto(
  UpdateTeacherResponseSchema,
) {}
export class TeacherStatsResponseDto extends createZodDto(
  TeacherStatsResponseSchema,
) {}
