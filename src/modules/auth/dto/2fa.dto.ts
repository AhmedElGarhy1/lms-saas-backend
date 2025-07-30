import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const TwoFASetupRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const TwoFAVerifyRequestSchema = z.object({
  code: z.string().min(1, '2FA code is required'),
  tempToken: z.string().min(1, 'Temporary token is required'),
});

export const TwoFactorRequestSchema = TwoFAVerifyRequestSchema;

export class TwoFASetupRequestDto extends createZodDto(
  TwoFASetupRequestSchema,
) {}
export class TwoFAVerifyRequestDto extends createZodDto(
  TwoFAVerifyRequestSchema,
) {}

// Add the missing export for TwoFactorRequest
export type TwoFactorRequest = z.infer<typeof TwoFactorRequestSchema>;
