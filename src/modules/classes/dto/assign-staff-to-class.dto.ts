import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class AssignStaffToClassDto {
  @ApiProperty({
    description: 'The ID of the user profile (staff) to assign to the class',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  userProfileId: string;
}

