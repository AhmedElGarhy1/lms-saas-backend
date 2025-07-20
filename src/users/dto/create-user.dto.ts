import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(6).optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export class CreateUserRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: 'Full name of the user', example: 'Jane Doe' })
  fullName: string;

  @ApiProperty({
    description: 'User password (optional for system-generated users)',
    example: 'password123',
    required: false,
  })
  password?: string;
}
