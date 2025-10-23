import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

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

// Alias for backward compatibility
export class UpdateProfileDto extends UpdateProfileRequestDto {}
