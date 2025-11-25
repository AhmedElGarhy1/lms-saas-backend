import { IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class SignupRequestDto {
  @IsString()
  @MinLength(2)
  name: string;

  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  code?: string; // 2FA code (if enabled)
}
