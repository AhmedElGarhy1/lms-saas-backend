import { IsString, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsString()
  @MinLength(6, { message: 'Current password must be at least 6 characters' })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  newPassword: string;
}
