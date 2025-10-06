import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { ActivityType } from '../entities/activity-log.entity';

export class PaginateActivityLogsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Center ID must be a valid UUID' })
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by actor ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Actor ID must be a valid UUID' })
  actorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by activity type',
    enum: ActivityType,
  })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @ApiPropertyOptional({
    description: 'Filter by activity level',
    type: String,
  })
  @IsOptional()
  @IsString()
  level?: string;
}
