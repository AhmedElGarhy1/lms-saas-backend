import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AddMemberRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleName: z
    .string()
    .min(1, 'Role name is required')
    .describe('Role name (Owner, Teacher, Student)'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional metadata for the member'),
});

export class AddMemberRequestDto extends createZodDto(AddMemberRequestSchema) {}
