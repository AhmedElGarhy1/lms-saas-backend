import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { HasBranchAccess } from '@/shared/common/decorators/has-branch-access.decorator';
import { HasUserAccess } from '@/shared/common/decorators/has-user-access.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Center } from '../entities/center.entity';
import { Branch } from '../entities/branch.entity';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';

export class BranchAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile to grant branch access to',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  @HasUserAccess()
  @HasCenterAccess()
  @IsProfileType(ProfileType.STAFF)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the center for which to grant branch access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;

  @ApiProperty({
    description: 'The ID of the branch for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Branch)
  @HasBranchAccess()
  branchId: string;
}
