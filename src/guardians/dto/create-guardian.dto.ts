import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateGuardianRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().describe('Phone number'),
  relationship: z
    .string()
    .optional()
    .describe('Relationship to student (e.g., Parent, Grandparent)'),
  emergencyContact: z
    .string()
    .optional()
    .describe('Emergency contact information'),
  centerId: z.string().optional().describe('Center ID to add guardian to'),
});

export class CreateGuardianRequestDto extends createZodDto(
  CreateGuardianRequestSchema,
) {}
