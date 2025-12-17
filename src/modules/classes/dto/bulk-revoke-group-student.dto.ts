import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Group } from '../entities/group.entity';

export class BulkRevokeGroupStudentDto {
  @ApiProperty({
    description: 'Group ID to revoke access from',
    example: 'uuid-group-id',
  })
  @IsUUID()
  @Exists(Group)
  groupId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to revoke group access from',
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
  userProfileIds: string[];
}
