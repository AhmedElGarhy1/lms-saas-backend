import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists, IsUserProfile } from '@/shared/common/decorators';
import { Center } from '@/modules/centers/entities/center.entity';

export class CenterAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile to grant center access to',
    format: 'uuid',
  })
  @IsUUID()
  @IsUserProfile()
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the center for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;
}
