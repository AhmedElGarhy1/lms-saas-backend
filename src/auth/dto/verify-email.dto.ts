import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export class VerifyEmailRequestDto extends createZodDto(
  VerifyEmailRequestSchema,
) {}
