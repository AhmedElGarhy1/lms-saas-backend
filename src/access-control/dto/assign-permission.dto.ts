import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleScopeEnum } from '../constants/role-scope.enum';

export class AssignPermissionDto {
  @ApiProperty({ description: 'Permission ID', example: 'perm123' })
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'User ID (for per-user override)',
    example: 'user123',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Role ID (for role assignment)',
    example: 'role123',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiProperty({
    description: 'Scope type (GLOBAL or CENTER)',
    enum: RoleScopeEnum,
    example: RoleScopeEnum.GLOBAL,
    required: false,
  })
  @IsEnum(RoleScopeEnum)
  @IsOptional()
  scopeType?: RoleScopeEnum;

  @ApiProperty({
    description: 'Scope ID (centerId if CENTER, null if GLOBAL)',
    example: 'center123',
    required: false,
  })
  @IsString()
  @IsOptional()
  scopeId?: string;
}
