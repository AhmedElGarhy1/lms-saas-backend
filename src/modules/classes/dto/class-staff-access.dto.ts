import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from '../entities/class.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class ClassStaffAccessDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to grant class access to',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  userProfileId: string;

  @ApiProperty({
    description: 'The ID of the center for which to grant class access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;

  @ApiProperty({
    description: 'The ID of the class for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Class)
  classId: string;
}

