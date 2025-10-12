import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { ActivityType } from '../entities/activity-log.entity';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';
import { User } from '@/modules/user/entities/user.entity';

export class PaginateActivityLogsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Center ID must be a valid UUID' })
  @Exists(Center)
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by actor ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Actor ID must be a valid UUID' })
  @Exists(User)
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
