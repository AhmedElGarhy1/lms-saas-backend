import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { StudentGrade } from '@prisma/client';

export const UpdateStudentRequestSchema = z.object({
  grade: z.nativeEnum(StudentGrade).optional().describe('Student grade level'),
  level: z.string().optional().describe('Student level'),
  performanceScore: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Performance score (0-100)'),
  notes: z.string().optional().describe('Additional notes about the student'),
  guardianId: z.string().optional().describe('Guardian ID'),
  teacherId: z.string().optional().describe('Teacher ID'),
});

export class UpdateStudentRequestDto extends createZodDto(
  UpdateStudentRequestSchema,
) {}
