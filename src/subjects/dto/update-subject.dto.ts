import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateSubjectRequestSchema = z.object({
  name: z
    .string()
    .min(2, 'Subject name must be at least 2 characters')
    .optional(),
  description: z.string().optional().describe('Subject description'),
  code: z
    .string()
    .min(1, 'Subject code is required')
    .optional()
    .describe('Subject code (e.g., MATH101)'),
  credits: z
    .number()
    .min(1)
    .optional()
    .describe('Number of credits for the subject'),
  isActive: z.boolean().optional().describe('Whether the subject is active'),
});

export class UpdateSubjectRequestDto extends createZodDto(
  UpdateSubjectRequestSchema,
) {}
