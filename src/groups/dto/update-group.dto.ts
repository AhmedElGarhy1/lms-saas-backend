import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateGroupRequestSchema = z.object({
  name: z
    .string()
    .min(2, 'Group name must be at least 2 characters')
    .optional(),
  description: z.string().optional().describe('Group description'),
  maxStudents: z
    .number()
    .min(1)
    .optional()
    .describe('Maximum number of students in the group'),
  gradeLevelId: z.string().optional().describe('Grade level ID for the group'),
});

export class UpdateGroupRequestDto extends createZodDto(
  UpdateGroupRequestSchema,
) {}
