import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  isActive: z.boolean().default(true),
  centerId: z.string().optional().describe('Center ID to add user to'),
  roleId: z.string().optional().describe('Role ID to assign to user'),
});

export class CreateUserRequestDto extends createZodDto(
  CreateUserRequestSchema,
) {}
