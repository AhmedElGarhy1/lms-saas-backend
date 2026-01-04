import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '@/modules/classes/entities/class.entity';

export class StudentClassParamsDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'uuid',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;

  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;
}
