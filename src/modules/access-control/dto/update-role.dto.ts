import {
  IsString,
  IsOptional,
  MinLength,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { RoleType } from '../../../shared/common/enums/role-type.enum';

export class UpdateRoleRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  @IsOptional()
  @IsEnum(RoleType, { message: 'Invalid role type' })
  type?: RoleType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
