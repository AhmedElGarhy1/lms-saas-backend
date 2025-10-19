import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class UserProfileDto {
  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'User date of birth', required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

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

  @ApiProperty({
    description: 'User profile information',
    type: UserProfileDto,
  })
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile: UserProfileDto;
}

export class CreateUserWithRoleDto extends CreateUserDto {
  @ApiProperty({
    description: 'Role ID for the user',
  })
  @IsUUID()
  @Exists(Role)
  roleId: string;

  @ApiProperty({
    description: 'Center ID (null for global roles)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string; // Can be null for global roles
}
