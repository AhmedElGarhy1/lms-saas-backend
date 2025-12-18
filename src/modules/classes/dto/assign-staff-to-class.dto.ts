import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { HasUserAccess } from '@/shared/common/decorators/has-user-access.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class AssignStaffToClassDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to assign to the class',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  @HasUserAccess()
  @HasCenterAccess()
  @IsProfileType(ProfileType.STAFF)
  userProfileId: string;
}
