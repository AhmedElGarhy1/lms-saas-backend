import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationGroup })
  @IsEnum(NotificationGroup)
  group: NotificationGroup;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ enum: ProfileType })
  @IsOptional()
  @IsEnum(ProfileType)
  profileType?: ProfileType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  profileId?: string | null;
}

export class BulkUpdatePreferenceDto {
  @ApiProperty({ type: [UpdateNotificationPreferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationPreferenceDto)
  preferences: UpdateNotificationPreferenceDto[];
}

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationGroup })
  group: NotificationGroup;

  @ApiProperty()
  enabled: boolean;

  @ApiPropertyOptional({ enum: ProfileType })
  profileType?: ProfileType | null;

  @ApiPropertyOptional()
  profileId?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
