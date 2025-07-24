import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateGroupRequestSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters'),
  description: z.string().optional().describe('Group description'),
  centerId: z.string().min(1, 'Center ID is required'),
  maxStudents: z
    .number()
    .min(1)
    .optional()
    .describe('Maximum number of students in the group'),
  gradeLevelId: z.string().optional().describe('Grade level ID for the group'),
});

export class CreateGroupRequestDto extends createZodDto(
  CreateGroupRequestSchema,
) {}
