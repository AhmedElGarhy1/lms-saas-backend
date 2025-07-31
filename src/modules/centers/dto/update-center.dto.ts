import {
  IsString,
  IsOptional,
  MinLength,
  IsEmail,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export class UpdateCenterRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

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
}
