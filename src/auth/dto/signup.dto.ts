import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export class SignupRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'test@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password (min 6 chars)',
    example: 'password123',
  })
  password: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  fullName: string;
}
