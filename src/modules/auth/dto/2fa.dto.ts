import { IsString, IsOptional, IsUUID } from 'class-validator';

export class TwoFASetupRequestDto {
  // No fields - uses authenticated user from JWT token
}

export class TwoFAVerifyRequestDto {
  @IsOptional()
  @IsUUID()
  userId?: string; // Optional - uses authenticated user by default

  @IsString()
  code: string;
}

export class TwoFactorRequest {
  @IsOptional()
  @IsUUID()
  userId?: string; // Optional - uses authenticated user by default

  @IsString()
  code: string;
}
