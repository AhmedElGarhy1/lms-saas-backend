import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsBoolean,
} from 'class-validator';

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
