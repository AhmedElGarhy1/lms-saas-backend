import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateRoleRequestSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').optional(),
  description: z.string().optional().describe('Role description'),
  permissions: z
    .array(z.string())
    .optional()
    .describe('Array of permission IDs'),
  isAdmin: z.boolean().optional().describe('Whether this is an admin role'),
  isActive: z.boolean().optional().describe('Whether the role is active'),
});

export class UpdateRoleRequestDto extends createZodDto(
  UpdateRoleRequestSchema,
) {}
