import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto, UserRoleDto } from './create-user.dto';

export class UpdateUserRequestDto {
  @ApiProperty({ description: 'User name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({ description: 'Whether user is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'User profile information', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto;

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
