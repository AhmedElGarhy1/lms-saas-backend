import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export class ResetPasswordRequestDto {
  @ApiProperty({ description: 'Reset token', example: 'token123' })
  token: string;

  @ApiProperty({ description: 'New password', example: 'newpassword123' })
  newPassword: string;
}
