import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists, CannotTargetSelf } from '@/shared/common/decorators';
import { UserProfile } from '../entities/user-profile.entity';

export class DeletedUserProfileIdParamDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile, 'id', true)
  @CannotTargetSelf()
  id: string;
}
