import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { NotificationChannel } from '@/modules/notifications/enums/notification-channel.enum';

export class ForgotPasswordRequestDto {
  @IsString()
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone: string;

  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel; // Optional - defaults to SMS for phone
}
