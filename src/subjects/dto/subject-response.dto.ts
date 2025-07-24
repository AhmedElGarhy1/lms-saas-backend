import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Subject Response Schema
export const SubjectResponseSchema = z.object({
  id: z.string().describe('Subject ID'),
  name: z.string().describe('Subject name'),
  description: z.string().optional().describe('Subject description'),
  code: z.string().describe('Subject code'),
  centerId: z.string().describe('Center ID'),
  gradeLevelId: z.string().describe('Grade level ID'),
  credits: z.number().optional().describe('Number of credits'),
  isActive: z.boolean().describe('Subject active status'),
  createdAt: z.date().describe('Subject creation timestamp'),
  updatedAt: z.date().describe('Subject last update timestamp'),
});

// Subject List Response Schema
export const SubjectListResponseSchema = z.object({
  subjects: z.array(SubjectResponseSchema).describe('List of subjects'),
  total: z.number().describe('Total number of subjects'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Subject Teachers Response Schema
export const SubjectTeachersResponseSchema = z.object({
  teachers: z
    .array(
      z.object({
        id: z.string().describe('Teacher ID'),
        name: z.string().describe('Teacher name'),
        email: z.string().email().describe('Teacher email'),
        specialization: z
          .string()
          .optional()
          .describe('Teacher specialization'),
        experienceYears: z.number().optional().describe('Years of experience'),
      }),
    )
    .describe('List of teachers for this subject'),
  total: z.number().describe('Total number of teachers'),
});

// Create Subject Response Schema
export const CreateSubjectResponseSchema = z.object({
  message: z.string().describe('Success message'),
  subject: SubjectResponseSchema.describe('Created subject information'),
});

// Update Subject Response Schema
export const UpdateSubjectResponseSchema = z.object({
  message: z.string().describe('Success message'),
  subject: SubjectResponseSchema.describe('Updated subject information'),
});

// Assign Teacher Response Schema
export const AssignTeacherResponseSchema = z.object({
  message: z.string().describe('Success message'),
  teacher: z
    .object({
      id: z.string().describe('Teacher ID'),
      name: z.string().describe('Teacher name'),
      email: z.string().email().describe('Teacher email'),
    })
    .describe('Assigned teacher information'),
});

// Create DTOs using nestjs-zod
export class SubjectResponseDto extends createZodDto(SubjectResponseSchema) {}
export class SubjectListResponseDto extends createZodDto(
  SubjectListResponseSchema,
) {}
export class SubjectTeachersResponseDto extends createZodDto(
  SubjectTeachersResponseSchema,
) {}
export class CreateSubjectResponseDto extends createZodDto(
  CreateSubjectResponseSchema,
) {}
export class UpdateSubjectResponseDto extends createZodDto(
  UpdateSubjectResponseSchema,
) {}
export class AssignTeacherResponseDto extends createZodDto(
  AssignTeacherResponseSchema,
) {}
