import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
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
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the group for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Group)
  groupId: string;
}
