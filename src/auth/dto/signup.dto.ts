import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SignupRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  centerId: z.string().optional().describe('Center ID to join after signup'),
});

export class SignupRequestDto extends createZodDto(SignupRequestSchema) {}
