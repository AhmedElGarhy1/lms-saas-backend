import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { PaginateUsersDto } from './paginate-users.dto';
import { Branch } from '@/modules/centers/entities/branch.entity';

export enum AccessibleUsersEnum {
  INCLUDE = 'include',
  ALL = 'all',
}

export class PaginateManagerUsersDto extends PaginateUsersDto {
  @ApiPropertyOptional({
    description: 'User ID for access control (internal use)',
    type: String,
  })
  @IsOptional()
  @IsString()
  userProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Role)
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Return only accessible users',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  userAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Return only accessible roles',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  roleAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Filter by branch ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Branch)
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Return only accessible branches',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  branchAccess?: AccessibleUsersEnum;
}
