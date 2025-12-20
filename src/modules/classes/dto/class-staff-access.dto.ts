import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '../entities/class.entity';

export class ClassStaffAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to grant class access to',
    format: 'uuid',
  })
  @IsUUID()
  @IsProfileType(ProfileType.STAFF)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the class for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Class)
  classId: string;
}
