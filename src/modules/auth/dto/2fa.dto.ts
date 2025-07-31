import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class TwoFASetupRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class TwoFAVerifyRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  code: string;
}

export class TwoFactorRequest {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  code: string;
}
