import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleScope } from './create-role.dto';

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID', example: 'user123' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Role ID', example: 'role123' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: 'Scope type (GLOBAL or CENTER)',
    enum: RoleScope,
    example: RoleScope.GLOBAL,
  })
  @IsEnum(RoleScope)
  scopeType: RoleScope;

  @ApiProperty({
    description: 'Scope ID (centerId if CENTER, null if GLOBAL)',
    example: 'center123',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  scopeId: string;
}
