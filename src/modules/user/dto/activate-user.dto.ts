import { IsString, IsEmail } from 'class-validator';

export class ActivateUserRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  token: string;
}
