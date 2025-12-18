import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { HasUserAccess } from '@/shared/common/decorators/has-user-access.decorator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '../entities/user-profile.entity';

export class UserProfileIdParamDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  @HasUserAccess()
  id: string;
}
