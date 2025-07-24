import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignStudentRequestSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
});

export class AssignStudentRequestDto extends createZodDto(
  AssignStudentRequestSchema,
) {}
