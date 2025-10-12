import { IsString, IsEmail } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class TwoFASetupRequestDto {
  @IsEmail()
  @Exists(User, 'email')
  email: string;
}

export class TwoFAVerifyRequestDto {
  @IsEmail()
  @Exists(User, 'email')
  email: string;

  @IsString()
  code: string;
}

export class TwoFactorRequest {
  @IsEmail()
  @Exists(User, 'email')
  email: string;

  @IsString()
  code: string;
}
