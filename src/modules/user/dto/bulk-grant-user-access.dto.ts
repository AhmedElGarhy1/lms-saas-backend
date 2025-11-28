import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
} from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class BulkGrantUserAccessDto {
  @ApiProperty({
    description: 'Granter user profile ID',
    example: 'uuid-granter-profile-id',
  })
  @IsUUID()
  @Exists(UserProfile)
  granterUserProfileId: string;

  @ApiProperty({
    description: 'Array of target user profile IDs to grant access to',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one target user profile ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 target user profile IDs allowed per request',
  })
  @IsUUID(4, {
    each: true,
    message: 'Each target user profile ID must be a valid UUID',
  })
  targetUserProfileIds: string[];

  @ApiProperty({
    description: 'Center ID (optional)',
    example: 'uuid-center-id',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}

