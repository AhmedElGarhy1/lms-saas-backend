import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SignupRequestDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  code?: string; // 2FA code (if enabled)
}
