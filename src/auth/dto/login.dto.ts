import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  code: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export class LoginRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'test@example.com',
  })
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  password: string;

  @ApiProperty({
    description: '2FA code (if enabled)',
    example: '123456',
    required: false,
  })
  code?: string;
}
