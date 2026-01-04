import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class ScanAttendanceDto {
  @ApiProperty({ description: 'Real session UUID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description:
      'User Profile ID (UUID) - must be a valid, active STUDENT profile',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;
}
