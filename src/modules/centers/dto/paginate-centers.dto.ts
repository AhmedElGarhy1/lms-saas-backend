import { IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

export class PaginateCentersDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by center name',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by center active status',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  // @ApiPropertyOptional({
  //   description: 'Filter by center accessible status',
  //   type: Boolean,
  // })
  // @IsOptional()
  // @IsBoolean()
  // centerIdAccess?: boolean;
}
