import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators';
import { UserProfile } from '../entities/user-profile.entity';

export class UserProfileIdParamDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  id: string;
}
