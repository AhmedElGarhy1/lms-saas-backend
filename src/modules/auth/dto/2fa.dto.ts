import { IsString, IsOptional } from 'class-validator';

export class TwoFAVerifyRequestDto {
  @IsOptional()
  @IsString()
  code?: string; // Optional - if not provided, OTP will be sent
}

export class TwoFactorRequest {
  @IsString()
  code: string;
}
