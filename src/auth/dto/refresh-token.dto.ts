import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class RefreshTokenRequestDto extends createZodDto(
  RefreshTokenRequestSchema,
) {}

// Add the missing export for RefreshTokenRequest
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
