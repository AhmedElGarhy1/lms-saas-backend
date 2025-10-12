import { IsString, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
