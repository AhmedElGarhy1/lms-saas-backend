import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFASetupDto {
  @ApiProperty({
    description: 'User password for 2FA setup',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class TwoFAVerifyDto {
  @ApiProperty({ description: '2FA verification code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
