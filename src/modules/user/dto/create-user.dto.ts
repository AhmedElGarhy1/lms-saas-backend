//
import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
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
  @IsString()
  phone: string;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'User email address', required: false })
  @IsOptional()
  @IsEmail()
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
