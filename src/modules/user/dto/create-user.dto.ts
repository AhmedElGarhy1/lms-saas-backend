import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}

export class CenterAccessDto {
  @IsOptional()
  @IsString()
  centerId?: string; // Can be null for global roles

  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

export class CreateUserRequestDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => UserProfileDto)
  profile: UserProfileDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterAccessDto)
  centerAccess?: CenterAccessDto[]; // Center access with roles (centerId can be null for global roles)
}
