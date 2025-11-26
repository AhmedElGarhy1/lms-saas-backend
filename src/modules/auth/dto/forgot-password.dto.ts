import { IsString, Matches } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsString()
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone: string;
}
