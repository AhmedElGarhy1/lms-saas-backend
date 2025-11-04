import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType } from '../enums/notification-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationSeverity } from '../entities/notification.entity';
import { NotificationActionType } from '../enums/notification-action-type.enum';

export class GetInAppNotificationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: ProfileType })
  @IsOptional()
  @IsEnum(ProfileType)
  profileType?: ProfileType | null;
}

export class InAppNotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  actionUrl?: string;

  @ApiPropertyOptional({ enum: NotificationActionType })
  actionType?: NotificationActionType;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  priority: number;

  @ApiPropertyOptional({ enum: NotificationSeverity })
  severity?: NotificationSeverity;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ enum: ProfileType })
  profileType?: ProfileType | null;

  @ApiPropertyOptional()
  profileId?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedInAppNotificationsDto {
  @ApiProperty({ type: [InAppNotificationResponseDto] })
  data: InAppNotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional()
  nextCursor?: string;
}

export class MarkAsReadDto {
  @ApiProperty({ type: [String], description: 'Array of notification IDs' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}

export class UnreadCountResponseDto {
  @ApiProperty()
  count: number;

  @ApiPropertyOptional({ enum: ProfileType })
  profileType?: ProfileType | null;

  @ApiPropertyOptional()
  profileId?: string | null;
}
