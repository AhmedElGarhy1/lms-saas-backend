import { IsString, MinLength, IsOptional } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
