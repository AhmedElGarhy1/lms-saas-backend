import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RequestEmailVerificationRequestDto {
  @IsString()
  @IsOptional()
  userId?: string; // Optional - if not provided, email must be provided

  @IsEmail()
  @IsOptional()
  email?: string; // Optional - if not provided, userId must be provided
}
