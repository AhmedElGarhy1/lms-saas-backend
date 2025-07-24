import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().optional().describe('2FA code (if enabled)'),
});

export class LoginRequestDto extends createZodDto(LoginRequestSchema) {}
