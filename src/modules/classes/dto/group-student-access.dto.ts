import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { HasBranchAccessViaResource } from '@/shared/common/decorators/has-branch-access-via-resource.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Group } from '../entities/group.entity';

export class GroupStudentAccessDto {
  @ApiProperty({
    description:
      'The ID of the user profile (student) to grant group access to',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  @HasCenterAccess()
  @IsProfileType(ProfileType.STUDENT)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the group for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @HasBranchAccessViaResource(Group)
  groupId: string;
}
