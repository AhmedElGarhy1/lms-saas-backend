import { IsEmail, MinLength, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'test@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: '2FA code (if enabled)',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;
}
