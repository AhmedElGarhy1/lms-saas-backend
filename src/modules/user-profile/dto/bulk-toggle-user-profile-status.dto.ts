import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsBoolean,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkToggleUserProfileStatusDto {
  @ApiProperty({
    description: 'Array of user profile IDs to toggle status',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user profile ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 1000 user profile IDs allowed per request',
  })
  @IsUUID(4, {
    each: true,
    message: 'Each user profile ID must be a valid UUID',
  })
  userProfileIds: string[];

  @ApiProperty({
    description: 'Active status to set for user profiles',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
