import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export class ForgotPasswordRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;
}
