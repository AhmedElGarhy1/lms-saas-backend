import { IsString, MinLength, IsEmail } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @IsString()
  token: string;
}
