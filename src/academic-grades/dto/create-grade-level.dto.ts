import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateGradeLevelRequestSchema = z.object({
  name: z.string().min(2, 'Grade level name must be at least 2 characters'),
  description: z.string().optional().describe('Grade level description'),
  centerId: z.string().min(1, 'Center ID is required'),
  order: z
    .number()
    .min(1)
    .optional()
    .describe('Display order for the grade level'),
  isActive: z
    .boolean()
    .default(true)
    .describe('Whether the grade level is active'),
});

export class CreateGradeLevelRequestDto extends createZodDto(
  CreateGradeLevelRequestSchema,
) {}
