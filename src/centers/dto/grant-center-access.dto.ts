import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const GrantCenterAccessRequestSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  roleName: z
    .string()
    .min(1, 'Role name is required')
    .describe('Role name to grant (Owner, Teacher, Student)'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional metadata for the access grant'),
});

export class GrantCenterAccessRequestDto extends createZodDto(
  GrantCenterAccessRequestSchema,
) {}
