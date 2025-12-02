import { IsString } from 'class-validator';

export class TwoFAVerifyRequestDto {
  @IsString()
  code: string;
}

export class TwoFactorRequest {
  @IsString()
  code: string;
}
