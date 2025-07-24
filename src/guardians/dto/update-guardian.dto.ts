import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateGuardianRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional().describe('Phone number'),
  relationship: z
    .string()
    .optional()
    .describe('Relationship to student (e.g., Parent, Grandparent)'),
  emergencyContact: z
    .string()
    .optional()
    .describe('Emergency contact information'),
  isActive: z.boolean().optional().describe('Whether the guardian is active'),
});

export class UpdateGuardianRequestDto extends createZodDto(
  UpdateGuardianRequestSchema,
) {}
