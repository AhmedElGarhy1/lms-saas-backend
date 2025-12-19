import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import {
  AccessibleUsersEnum,
  PaginateUsersDto,
} from '@/modules/user/dto/paginate-users.dto';
import { Transform } from 'class-transformer';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { HasUserAccess } from '@/shared/common/decorators/has-user-access.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';

export class PaginateTeacherDto extends PaginateUsersDto {
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
    description: 'Filter by role ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsProfileType(ProfileType.STAFF)
  @HasUserAccess()
  @HasCenterAccess()
  staffProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by staff profile access',
    type: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
    enum: AccessibleUsersEnum,
    enumName: 'AccessibleUsersEnum',
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  staffProfileAccess?: AccessibleUsersEnum;
}
