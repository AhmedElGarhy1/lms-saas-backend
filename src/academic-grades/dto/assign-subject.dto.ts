import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignSubjectRequestSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
});

export class AssignSubjectRequestDto extends createZodDto(
  AssignSubjectRequestSchema,
) {}
