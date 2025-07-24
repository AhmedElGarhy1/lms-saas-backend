import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignPermissionRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permissionId: z.string().min(1, 'Permission ID is required'),
  scopeType: z
    .enum(['GLOBAL', 'CENTER'])
    .describe('Permission scope (GLOBAL or CENTER)'),
  centerId: z
    .string()
    .optional()
    .describe('Center ID (required for CENTER scope)'),
  isActive: z
    .boolean()
    .default(true)
    .describe('Whether the permission assignment is active'),
});

export class AssignPermissionRequestDto extends createZodDto(
  AssignPermissionRequestSchema,
) {}
