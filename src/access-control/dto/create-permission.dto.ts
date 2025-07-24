import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreatePermissionRequestSchema = z.object({
  action: z.string().min(2, 'Permission action must be at least 2 characters'),
  resource: z
    .string()
    .min(2, 'Permission resource must be at least 2 characters'),
  description: z.string().optional().describe('Permission description'),
  isActive: z
    .boolean()
    .default(true)
    .describe('Whether the permission is active'),
});

export class CreatePermissionRequestDto extends createZodDto(
  CreatePermissionRequestSchema,
) {}
