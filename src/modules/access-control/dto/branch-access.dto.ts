import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

export class BranchAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile to grant branch access to',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
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
  @Exists(Branch)
  branchId: string;
}
