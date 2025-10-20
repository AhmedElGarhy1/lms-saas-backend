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
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

export enum AccessibleUsersEnum {
  INCLUDE = 'include',
  ALL = 'all',
}

export class PaginateUsersDto extends BasePaginationDto {
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
    description: 'Filter by branch ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Branch)
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Return only accessible users',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  userAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Return only accessible centers',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  centerAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Return only accessible roles',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  roleAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Return only accessible branches',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  branchAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Display role in case of centerId provided',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  displayRole?: boolean;
}
