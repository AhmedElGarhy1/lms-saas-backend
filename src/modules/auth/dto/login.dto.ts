import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsString()
  code?: string; // 2FA code (if enabled)
}
