import {
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';
import { RolePermissionDto } from './role-permission.dto';
import { Type } from 'class-transformer';

export class CreateRoleRequestDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

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
  permissions: RolePermissionDto[];
}
