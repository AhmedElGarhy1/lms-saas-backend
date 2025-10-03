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

export class CenterAccessDto {
  @ApiProperty({
    description: 'Center ID (null for global roles)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  centerId?: string; // Can be null for global roles

  @ApiProperty({
    description: 'Role ID for this center',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleId?: string;
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
    description:
      'Center access with roles (centerId can be null for global roles)',
    required: false,
    type: [CenterAccessDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterAccessDto)
  centerAccess?: CenterAccessDto[];
}
