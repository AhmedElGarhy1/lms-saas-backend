import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ActivateUserRequestSchema = z.object({
  isActive: z.boolean().describe('Whether to activate or deactivate the user'),
  scopeType: z.enum(['GLOBAL', 'CENTER']).describe('Scope type for activation'),
  centerId: z
    .string()
    .optional()
    .describe('Center ID (required for CENTER scope)'),
});

export class ActivateUserRequestDto extends createZodDto(
  ActivateUserRequestSchema,
) {}
