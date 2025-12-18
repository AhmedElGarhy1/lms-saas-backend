import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { HasBranchAccessViaResource } from '@/shared/common/decorators/has-branch-access-via-resource.decorator';
import { HasUserAccess } from '@/shared/common/decorators/has-user-access.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '../entities/class.entity';

export class ClassStaffAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to grant class access to',
    format: 'uuid',
  })
  @IsUUID()
  @HasUserAccess()
  @HasCenterAccess()
  @IsProfileType(ProfileType.STAFF)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the class for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @HasBranchAccessViaResource(Class)
  classId: string;
}
