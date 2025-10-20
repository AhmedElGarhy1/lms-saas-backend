import { IsString, MinLength, IsOptional, IsNotEmpty } from 'class-validator';

export class LoginRequestDto {
  @IsNotEmpty()
  @IsString()
  emailOrPhone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  code?: string; // 2FA code (if enabled)
}
