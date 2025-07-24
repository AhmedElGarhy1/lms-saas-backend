import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export class ForgotPasswordRequestDto extends createZodDto(
  ForgotPasswordRequestSchema,
) {}
