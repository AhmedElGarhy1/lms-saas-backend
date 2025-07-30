import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export class ResetPasswordRequestDto extends createZodDto(
  ResetPasswordRequestSchema,
) {}
