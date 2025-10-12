import { IsString, MinLength, IsEmail } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class ResetPasswordRequestDto {
  @IsEmail()
  @Exists(User, 'email')
  email: string;

  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsString()
  token: string;
}
