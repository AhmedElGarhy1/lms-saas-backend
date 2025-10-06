import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

export class PaginatePermissionsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by admin-only permissions',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
