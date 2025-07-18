import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RoleScope {
  GLOBAL = 'GLOBAL',
  CENTER = 'CENTER',
}

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Admin' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Role scope (GLOBAL or CENTER)',
    enum: RoleScope,
    example: RoleScope.GLOBAL,
  })
  @IsEnum(RoleScope)
  scope: RoleScope;

  @ApiProperty({
    description: 'Center ID (required if scope is CENTER)',
    example: 'center123',
    required: false,
  })
  @IsString()
  @IsOptional()
  centerId?: string;

  @ApiProperty({
    description: 'Optional metadata for the role',
    example: '{ "color": "blue" }',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Is this role public?',
    example: false,
    required: false,
  })
  @IsOptional()
  isPublic?: boolean;
}
