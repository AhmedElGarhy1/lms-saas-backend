import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

export class PaginateRolesDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Center ID must be a valid UUID' })
  centerId?: string;
}
