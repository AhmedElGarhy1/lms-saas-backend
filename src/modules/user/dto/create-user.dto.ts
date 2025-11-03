//
import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  ValidateNested,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotExists } from '@/shared/common/decorators/not-exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { Locale } from '@/shared/common/enums/locale.enum';
import { Type } from 'class-transformer';

export class UserInfoDto {
  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'User date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @ApiProperty({ description: 'User locale', required: false })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
export class CreateUserDto {
  @ApiProperty({ description: 'User phone number', required: false })
  @Matches(/^(\+?20)?1[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  @NotExists(User, 'phone', { message: 'Phone number already exists' })
  phone: string;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'User email address', required: false })
  @IsOptional()
  @IsEmail()
  @NotExists(User, 'email', { message: 'Email already exists' })
  email?: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Whether user is active',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'User info', type: UserInfoDto })
  @ValidateNested()
  @Type(() => UserInfoDto)
  @IsNotEmpty()
  userInfo: UserInfoDto;
}
