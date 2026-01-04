import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { BelongsToBranch, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Group } from '../entities/group.entity';

export class BulkAssignStudentsToGroupDto {
  @ApiProperty({
    description: 'Group ID to assign students to',
    example: 'uuid-group-id',
  })
  @IsUUID()
  @BelongsToBranch(Group)
  groupId: string;

  @ApiProperty({
    description: 'Array of user profile IDs (students) to assign to the group',
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
  @IsUserProfile(ProfileType.STUDENT)
  userProfileIds: string[];

  @ApiPropertyOptional({
    description:
      'Skip student conflict warnings. If true, student schedule conflicts will be ignored and operation will proceed.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipWarning?: boolean;
}
