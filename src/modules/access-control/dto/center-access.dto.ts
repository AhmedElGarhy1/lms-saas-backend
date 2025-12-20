import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class CenterAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile to grant center access to',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the center for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;
}
