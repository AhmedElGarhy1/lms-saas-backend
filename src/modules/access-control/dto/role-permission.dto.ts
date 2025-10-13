import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ScopeType } from '@/shared/common/decorators/scope.decorator';
import { Permission } from '../entities';
import { Exists } from '@/shared/common/decorators';

export class RolePermissionDto {
  @ApiProperty({
    description: 'Permission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @Exists(Permission)
  id: string;

  @ApiProperty({
    description: 'Permission scope',
    enum: ScopeType,
    example: ScopeType.CENTER,
  })
  @IsEnum(ScopeType)
  scope: ScopeType;
}
