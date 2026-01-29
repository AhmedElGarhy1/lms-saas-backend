import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM device token for push notifications',
    minLength: 80,
    maxLength: 256,
  })
  @IsString()
  @MinLength(80, { message: 'fcmToken must be a valid FCM device token' })
  @MaxLength(256)
  fcmToken: string;

  @ApiProperty({
    description: 'Optional device name for "manage devices" UI',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;
}
