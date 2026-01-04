import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { BelongsToBranch, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Group } from '../entities/group.entity';

export class GroupStudentAccessDto {
  @ApiProperty({
    description:
      'The ID of the user profile (student) to grant group access to',
    format: 'uuid',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the group for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Group)
  groupId: string;

  @ApiPropertyOptional({
    description:
      'Skip student conflict warnings. If true, student schedule conflicts will be ignored and operation will proceed.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipWarning?: boolean;
}
