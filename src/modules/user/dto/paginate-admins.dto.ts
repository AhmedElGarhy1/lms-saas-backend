import { IsOptional, IsBoolean, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { AccessibleUsersEnum } from './paginate-users.dto';

export class PaginateAdminsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'User ID for access control (internal use)',
    type: String,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user active status',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
      return undefined; // Invalid string value
    }
    if (typeof value === 'boolean') {
      return value; // Already a boolean
    }
    return undefined; // Not a string or boolean
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Center ID must be a valid UUID' })
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user access',
    type: String,
  })
  @IsOptional()
  @IsString()
  userAccess?: AccessibleUsersEnum;
}
