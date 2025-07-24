import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const TwoFASetupRequestSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const TwoFAVerifyRequestSchema = z.object({
  code: z.string().min(1, '2FA code is required'),
});

export const TwoFactorRequestSchema = TwoFAVerifyRequestSchema.extend({
  tempToken: z.string().min(1, 'Temporary token is required'),
});

export class TwoFASetupRequestDto extends createZodDto(
  TwoFASetupRequestSchema,
) {}
export class TwoFAVerifyRequestDto extends createZodDto(
  TwoFAVerifyRequestSchema,
) {}

// Add the missing export for TwoFactorRequest
export type TwoFactorRequest = z.infer<typeof TwoFactorRequestSchema>;
