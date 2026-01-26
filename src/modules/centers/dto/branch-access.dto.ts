import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import {
  BelongsToCenter,
  IsUserProfile,
} from '@/shared/common/decorators';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '../entities/center.entity';
import { Branch } from '../entities/branch.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class BranchAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile to grant branch access to',
    format: 'uuid',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STAFF)
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
  branchId: string;
}
