import {
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
