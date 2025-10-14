import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';
import { PaginateRolesDto } from './paginate-roles.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { RoleType } from '@/shared/common/enums/role-type.enum';

export class ExportRolesDto extends ExportQueryDto {
  // Inherits all properties from ExportQueryDto and BasePaginationDto
  // Add any role-specific export filters here if needed, e.g.,
  @ApiPropertyOptional({
    description: 'Filter by role type',
    enum: RoleType,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoleType)
  type?: RoleType;

  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by read-only status',
    type: Boolean,
    required: false,
  })
  @IsOptional()
  readOnly?: boolean;
}
