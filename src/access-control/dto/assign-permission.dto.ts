import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleScope } from '../constants/rolescope';

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
    enum: RoleScope,
    example: RoleScope.GLOBAL,
    required: false,
  })
  @IsEnum(RoleScope)
  @IsOptional()
  scopeType?: RoleScope;

  @ApiProperty({
    description: 'Scope ID (centerId if CENTER, null if GLOBAL)',
    example: 'center123',
    required: false,
  })
  @IsString()
  @IsOptional()
  scopeId?: string;
}
