import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSubjectRequestSchema = z.object({
  name: z.string().min(2, 'Subject name must be at least 2 characters'),
  description: z.string().optional().describe('Subject description'),
  code: z
    .string()
    .min(1, 'Subject code is required')
    .describe('Subject code (e.g., MATH101)'),
  gradeLevelId: z.string().min(1, 'Grade level ID is required'),
  credits: z
    .number()
    .min(1)
    .optional()
    .describe('Number of credits for the subject'),
  isActive: z.boolean().default(true).describe('Whether the subject is active'),
});

export class CreateSubjectRequestDto extends createZodDto(
  CreateSubjectRequestSchema,
) {}
