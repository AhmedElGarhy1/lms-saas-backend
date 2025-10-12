import { IsEmail } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class ForgotPasswordRequestDto {
  @IsEmail()
  @Exists(User, 'email')
  email: string;
}
