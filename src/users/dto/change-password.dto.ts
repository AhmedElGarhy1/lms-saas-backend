import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export class ChangePasswordRequestDto extends createZodDto(
  ChangePasswordRequestSchema,
) {}
