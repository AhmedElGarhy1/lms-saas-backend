import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export class VerifyEmailRequestDto {
  @ApiProperty({ description: 'Verification token', example: 'token123' })
  token: string;
}
