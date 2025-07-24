import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateRoleRequestSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional().describe('Role description'),
  scope: z.enum(['GLOBAL', 'CENTER']).describe('Role scope (GLOBAL or CENTER)'),
  centerId: z
    .string()
    .optional()
    .describe('Center ID (required for CENTER scope)'),
  permissions: z
    .array(z.string())
    .optional()
    .describe('Array of permission IDs'),
  isAdmin: z.boolean().default(false).describe('Whether this is an admin role'),
  isActive: z.boolean().default(true).describe('Whether the role is active'),
});

export class CreateRoleRequestDto extends createZodDto(
  CreateRoleRequestSchema,
) {}
