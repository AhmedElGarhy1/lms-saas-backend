import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsUUID,
  IsString,
  IsEnum,
} from 'class-validator';
import {
  AccessibleUsersEnum,
  PaginateUsersDto,
} from '@/modules/user/dto/paginate-users.dto';
import { Transform } from 'class-transformer';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Group } from '@/modules/classes/entities/group.entity';
import { Class } from '@/modules/classes/entities/class.entity';

export class PaginateStudentDto extends PaginateUsersDto {
  @ApiPropertyOptional({
    description: 'Display role in case of centerId provided',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  displayDetailes?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by group ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Group)
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Filter by class ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Class)
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter by class access',
    enum: AccessibleUsersEnum,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  classAccess?: AccessibleUsersEnum;

  @ApiPropertyOptional({
    description: 'Filter by group access',
    enum: AccessibleUsersEnum,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  groupAccess?: AccessibleUsersEnum;
}
