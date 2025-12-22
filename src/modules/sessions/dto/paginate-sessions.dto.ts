import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { SessionStatus } from '../enums/session-status.enum';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Group } from '@/modules/classes/entities/group.entity';
import { Class } from '@/modules/classes/entities/class.entity';

export class PaginateSessionsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by group ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Group)
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Filter by class ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Class)
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter by session status',
    enum: SessionStatus,
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({
    description: 'Filter sessions from this date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  startTimeFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter sessions until this date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  startTimeTo?: string;
}



