import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const ChangePasswordRequestSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export class ChangePasswordRequestDto {
  @ApiProperty({ description: 'Current password', example: 'oldpassword' })
  oldPassword: string;

  @ApiProperty({
    description: 'New password (min 6 chars)',
    example: 'newpassword123',
  })
  newPassword: string;
}
