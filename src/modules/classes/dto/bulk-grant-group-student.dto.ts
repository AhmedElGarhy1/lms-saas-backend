import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Group } from '../entities/group.entity';

export class BulkGrantGroupStudentDto {
  @ApiProperty({
    description: 'Group ID to grant access to',
    example: 'uuid-group-id',
  })
  @IsUUID()
  @BelongsToBranch(Group)
  groupId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to grant group access to',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user profile ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 user profile IDs allowed per request',
  })
  @IsUUID(4, {
    each: true,
    message: 'Each user profile ID must be a valid UUID',
  })
  @IsProfileType(ProfileType.STUDENT, { each: true })
  userProfileIds: string[];
}
