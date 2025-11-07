import { IsOptional, IsString } from 'class-validator';

export class RequestPhoneVerificationRequestDto {
  @IsString()
  @IsOptional()
  userId?: string; // Optional - if not provided, phone must be provided

  @IsString()
  @IsOptional()
  phone?: string; // Optional - if not provided, userId must be provided
}
