import {
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';
import { RolePermissionDto } from './role-permission.dto';
import { Type } from 'class-transformer';

export class CreateRoleRequestDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  // @Min(1)
  rolePermissions: RolePermissionDto[];
}
