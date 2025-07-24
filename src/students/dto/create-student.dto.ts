import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { StudentGrade } from '@prisma/client';

export const CreateStudentRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  grade: z.nativeEnum(StudentGrade).describe('Student grade level'),
  level: z.string().optional().describe('Student level'),
  performanceScore: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Performance score (0-100)'),
  notes: z.string().optional().describe('Additional notes about the student'),
  centerId: z.string().optional().describe('Center ID to add student to'),
});

export class CreateStudentRequestDto extends createZodDto(
  CreateStudentRequestSchema,
) {}
