import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { RoleTypeEnum } from '../constants/role-type.enum';

export const UpdateRoleRequestSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').optional(),
  description: z.string().optional().describe('Role description'),
  permissions: z
    .array(z.string())
    .optional()
    .describe('Array of permission IDs'),
  isAdmin: z.boolean().optional().describe('Whether this is an admin role'),
  type: z.enum(RoleTypeEnum).optional().describe('Role type in the hierarchy'),
});

export class UpdateRoleRequestDto extends createZodDto(
  UpdateRoleRequestSchema,
) {}
