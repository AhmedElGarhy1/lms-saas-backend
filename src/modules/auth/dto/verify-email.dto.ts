import { IsEmail, IsString } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class VerifyEmailRequestDto {
  @IsEmail()
  @Exists(User, 'email')
  email: string;

  @IsString()
  token: string;
}
