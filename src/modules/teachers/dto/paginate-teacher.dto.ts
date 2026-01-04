import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import {
  AccessibleUsersEnum,
  PaginateUsersDto,
} from '@/modules/user/dto/paginate-users.dto';
import { Transform } from 'class-transformer';
import { IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

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
  @IsUserProfile(ProfileType.STAFF)
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
