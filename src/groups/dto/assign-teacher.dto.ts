import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignTeacherRequestSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
});

export class AssignTeacherRequestDto extends createZodDto(
  AssignTeacherRequestSchema,
) {}
