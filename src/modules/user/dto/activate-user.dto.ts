import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';

export class ActivateUserRequestDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  @Exists(User, 'email')
  email: string;

  @ApiProperty({ description: 'Activation token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
