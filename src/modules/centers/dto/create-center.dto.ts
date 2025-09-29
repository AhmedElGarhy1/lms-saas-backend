import {
  IsString,
  IsOptional,
  MinLength,
  IsEmail,
  IsUrl,
  IsBoolean,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfileDto } from '@/modules/user/dto/create-user.dto';

export class CreateCenterUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'User name must be at least 2 characters' })
  name: string;

  @IsEmail({}, { message: 'Invalid user email format' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'User password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => UserProfileDto)
  profile: UserProfileDto;
}

export class CreateCenterRequestDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid website URL' })
  website?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // User object for center admin
  @ValidateNested()
  @Type(() => CreateCenterUserDto)
  user: CreateCenterUserDto;
}
