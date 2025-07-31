import { IsString, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @IsString()
  @MinLength(10, { message: 'Refresh token must be at least 10 characters' })
  refreshToken: string;
}
