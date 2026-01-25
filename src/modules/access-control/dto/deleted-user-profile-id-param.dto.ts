import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class DeletedUserProfileIdParamDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile, 'id', true)
  userProfileId: string;
}
