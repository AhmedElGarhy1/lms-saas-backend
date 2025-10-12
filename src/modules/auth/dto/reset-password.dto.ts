import { IsString, MinLength, IsEmail } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class ResetPasswordRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Exists(User, 'email')
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @IsString()
  token: string;
}
