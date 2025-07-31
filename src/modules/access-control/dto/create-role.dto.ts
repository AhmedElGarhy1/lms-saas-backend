import {
  IsString,
  IsOptional,
  MinLength,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { RoleTypeEnum } from '../constants/role-type.enum';

export class CreateRoleRequestDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEnum(RoleTypeEnum, { message: 'Invalid role type' })
  type: RoleTypeEnum;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
