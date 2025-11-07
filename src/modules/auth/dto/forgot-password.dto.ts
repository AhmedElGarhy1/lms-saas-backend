import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '@/modules/notifications/enums/notification-channel.enum';

export class ForgotPasswordRequestDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel; // Optional - will be auto-detected based on email/phone
}
