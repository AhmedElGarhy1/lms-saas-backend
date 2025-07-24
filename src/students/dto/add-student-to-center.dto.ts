import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AddStudentToCenterRequestSchema = z.object({
  roleName: z
    .string()
    .optional()
    .describe('Role name to assign (defaults to Student)'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional metadata for the student in this center'),
});

export class AddStudentToCenterRequestDto extends createZodDto(
  AddStudentToCenterRequestSchema,
) {}
