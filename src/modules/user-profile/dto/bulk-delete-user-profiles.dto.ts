import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkDeleteUserProfilesDto {
  @ApiProperty({
    description: 'Array of user profile IDs to delete',
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
