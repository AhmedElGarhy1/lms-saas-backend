import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class TwoFASetupRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Exists(User, 'email')
  email: string;
}

export class TwoFAVerifyRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Exists(User, 'email')
  email: string;

  @IsString()
  code: string;
}

export class TwoFactorRequest {
  @IsEmail({}, { message: 'Invalid email format' })
  @Exists(User, 'email')
  email: string;

  @IsString()
  code: string;
}
