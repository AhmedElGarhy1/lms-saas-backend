import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

export class PaginateActivityLogsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by activity type',
    type: String,
  })
  @IsOptional()
  type?: string;
}
