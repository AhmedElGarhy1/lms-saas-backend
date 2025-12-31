import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists, BelongsToCenter } from '@/shared/common/decorators';
import { Class } from '@/modules/classes/entities/class.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class StudentClassParamsDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(UserProfile)
  studentUserProfileId: string;

  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;
}
