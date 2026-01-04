import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '../entities/class.entity';

export class ClassStaffAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to grant class access to',
    format: 'uuid',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STAFF)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the class for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Class)
  classId: string;
}
