import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import {
  Exists,
  IsUserProfile,
  CannotTargetSelf,
} from '@/shared/common/decorators';
import { Center } from '@/modules/centers/entities/center.entity';

export class BulkRevokeCenterAccessDto {
  @ApiProperty({
    description: 'Center ID to revoke access from',
    example: 'uuid-center-id',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to revoke center access from',
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
  @IsUserProfile(undefined, { each: true })
  @CannotTargetSelf({ each: true })
  userProfileIds: string[];
}
