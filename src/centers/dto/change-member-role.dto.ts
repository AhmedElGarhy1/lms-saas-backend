import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ChangeMemberRoleRequestSchema = z.object({
  newRole: z
    .string()
    .min(1, 'New role is required')
    .describe('New role name (Owner, Teacher, Student)'),
});

export class ChangeMemberRoleRequestDto extends createZodDto(
  ChangeMemberRoleRequestSchema,
) {}
