import {
  IsString,
  IsEmail,
  IsUrl,
  IsBoolean,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCenterDto {
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

  // User object for center admin
  @ApiProperty({ type: CreateUserDto })
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;
}
