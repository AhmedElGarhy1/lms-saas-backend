import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Locale } from '@/shared/common/enums/locale.enum';

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

  // User Info fields (flattened)
  @ApiProperty({ description: 'User full name for user info', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'User date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'User locale',
    required: false,
    default: Locale.AR,
  })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  // Custom validation method
  validateEmailOrPhone() {
    if (!this.email && !this.phone) {
      throw new Error('Either email or phone must be provided');
    }
    return true;
  }
}

// Base DTO with role and center fields for profile-specific user creation
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
  centerId?: string;
}
