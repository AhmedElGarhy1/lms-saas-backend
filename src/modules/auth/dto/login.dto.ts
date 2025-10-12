import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class LoginRequestDto {
  @IsEmail()
  @Exists(User, 'email')
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  code?: string; // 2FA code (if enabled)
}
