import { IsEmail, IsString } from 'class-validator';

export class VerifyEmailRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  token: string;
}
