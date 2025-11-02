import { NotExists } from '@/shared/common/decorators';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Center } from '../entities/center.entity';

export class UpdateCenterRequestDto {
  @ApiProperty({ description: 'Center name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Center description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Center phone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Center email' })
  @NotExists(Center, 'email', { message: 'Email already exists' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Center website' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Whether the center is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Center logo' })
  @IsString()
  @IsOptional()
  logo?: string;
}
