import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestImportOtpDto {
  @ApiProperty({
    description: 'Phone number to send OTP to (format: Egyptian mobile number)',
    example: '01234567890',
  })
  @IsString()
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone: string;
}
