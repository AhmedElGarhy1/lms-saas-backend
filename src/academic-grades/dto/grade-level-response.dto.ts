import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Grade Level Response Schema
export const GradeLevelResponseSchema = z.object({
  id: z.string().describe('Grade level ID'),
  name: z.string().describe('Grade level name'),
  description: z.string().optional().describe('Grade level description'),
  centerId: z.string().describe('Center ID'),
  order: z.number().optional().describe('Display order for the grade level'),
  isActive: z.boolean().describe('Grade level active status'),
  createdAt: z.date().describe('Grade level creation timestamp'),
  updatedAt: z.date().describe('Grade level last update timestamp'),
});

// Grade Level List Response Schema
export const GradeLevelListResponseSchema = z.object({
  gradeLevels: z
    .array(GradeLevelResponseSchema)
    .describe('List of grade levels'),
  total: z.number().describe('Total number of grade levels'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Grade Level Subjects Response Schema
export const GradeLevelSubjectsResponseSchema = z.object({
  subjects: z
    .array(
      z.object({
        id: z.string().describe('Subject ID'),
        name: z.string().describe('Subject name'),
        code: z.string().describe('Subject code'),
        description: z.string().optional().describe('Subject description'),
        credits: z.number().optional().describe('Number of credits'),
      }),
    )
    .describe('List of subjects for this grade level'),
  total: z.number().describe('Total number of subjects'),
});

// Create Grade Level Response Schema
export const CreateGradeLevelResponseSchema = z.object({
  message: z.string().describe('Success message'),
  gradeLevel: GradeLevelResponseSchema.describe(
    'Created grade level information',
  ),
});

// Update Grade Level Response Schema
export const UpdateGradeLevelResponseSchema = z.object({
  message: z.string().describe('Success message'),
  gradeLevel: GradeLevelResponseSchema.describe(
    'Updated grade level information',
  ),
});

// Assign Subject Response Schema
export const AssignSubjectResponseSchema = z.object({
  message: z.string().describe('Success message'),
  subject: z
    .object({
      id: z.string().describe('Subject ID'),
      name: z.string().describe('Subject name'),
      code: z.string().describe('Subject code'),
    })
    .describe('Assigned subject information'),
});

// Create DTOs using nestjs-zod
export class GradeLevelResponseDto extends createZodDto(
  GradeLevelResponseSchema,
) {}
export class GradeLevelListResponseDto extends createZodDto(
  GradeLevelListResponseSchema,
) {}
export class GradeLevelSubjectsResponseDto extends createZodDto(
  GradeLevelSubjectsResponseSchema,
) {}
export class CreateGradeLevelResponseDto extends createZodDto(
  CreateGradeLevelResponseSchema,
) {}
export class UpdateGradeLevelResponseDto extends createZodDto(
  UpdateGradeLevelResponseSchema,
) {}
export class AssignSubjectResponseDto extends createZodDto(
  AssignSubjectResponseSchema,
) {}
