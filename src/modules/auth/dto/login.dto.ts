import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class LoginRequestDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  code?: string; // 2FA code (if enabled)

  @IsOptional()
  @IsString()
  @MinLength(80, {
    message: 'fcmToken must be a valid FCM device token (80–256 chars)',
  })
  @MaxLength(256)
  fcmToken?: string;
}
