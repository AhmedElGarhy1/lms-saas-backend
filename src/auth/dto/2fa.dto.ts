import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const TwoFASetupRequestSchema = z.object({
  password: z.string().min(6),
});
export type TwoFASetupRequest = z.infer<typeof TwoFASetupRequestSchema>;

export class TwoFASetupDto {
  @ApiProperty({
    description: 'User password for 2FA setup',
    example: 'password123',
  })
  password: string;
}

export const TwoFAVerifyRequestSchema = z.object({
  code: z.string().min(1),
});
export type TwoFAVerifyRequest = z.infer<typeof TwoFAVerifyRequestSchema>;

export class TwoFAVerifyDto {
  @ApiProperty({ description: '2FA code', example: '123456' })
  code: string;
}
