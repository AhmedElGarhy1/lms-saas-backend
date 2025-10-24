import {
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { AccessibleUsersEnum } from './paginate-users.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class PaginateAdminsDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'User ID for access control (internal use)',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  userProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user active status',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Role)
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user access',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  userAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Filter by role access',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  roleAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Filter by center access',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  centerAccess?: AccessibleUsersEnum;
}
