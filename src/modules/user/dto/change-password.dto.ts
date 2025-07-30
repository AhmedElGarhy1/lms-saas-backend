import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { passwordSchema } from '../../../common/validation/zod.config';

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export class ChangePasswordRequestDto extends createZodDto(
  ChangePasswordRequestSchema,
) {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
    minLength: 1,
    required: true,
  })
  declare currentPassword: string;

  @ApiProperty({
    description: 'New password (must meet security requirements)',
    example: 'newSecurePassword456!',
    minLength: 8,
    required: true,
  })
  declare newPassword: string;
}
