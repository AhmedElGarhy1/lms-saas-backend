import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class UserAccessDto {
  @ApiProperty({ description: 'Granter user profile ID' })
  @IsUUID()
  @Exists(UserProfile)
  granterUserProfileId: string;

  @ApiProperty({ description: 'Target user profile ID' })
  @IsUUID()
  @Exists(UserProfile)
  targetUserProfileId: string;

  @ApiProperty({ description: 'Center ID', required: false })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}
