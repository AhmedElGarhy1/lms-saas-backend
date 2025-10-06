import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'User date of birth', required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}

export class UserRoleDto {
  @ApiProperty({
    description: 'Role ID for the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'Center ID (null for global roles)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  centerId?: string; // Can be null for global roles
}

export class CreateUserRequestDto {
  @ApiProperty({ description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    description: 'Whether user is active',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'User profile information',
    type: UserProfileDto,
  })
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile: UserProfileDto;

  @ApiProperty({
    description: 'User role assignment (one role per scope)',
    required: false,
    type: UserRoleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserRoleDto)
  userRole?: UserRoleDto;
}
