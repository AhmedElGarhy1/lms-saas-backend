import { IsNotEmpty, IsString } from 'class-validator';

export class TwoFAVerifyRequestDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class TwoFactorRequest {
  @IsString()
  code: string;
}
