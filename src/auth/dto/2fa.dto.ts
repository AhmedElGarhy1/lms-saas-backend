import { IsString, IsNotEmpty } from 'class-validator';

export class TwoFASetupDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class TwoFAVerifyDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
