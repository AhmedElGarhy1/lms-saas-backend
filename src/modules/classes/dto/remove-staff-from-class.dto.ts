import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class RemoveStaffFromClassDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to remove from the class',
    format: 'uuid',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STAFF)
  userProfileId: string;
}
