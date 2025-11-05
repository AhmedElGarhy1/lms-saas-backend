import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType } from '../enums/notification-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

export class GetInAppNotificationsDto extends BasePaginationDto {
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
