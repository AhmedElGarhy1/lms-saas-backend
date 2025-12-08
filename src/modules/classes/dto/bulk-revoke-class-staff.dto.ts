import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Class } from '../entities/class.entity';

export class BulkRevokeClassStaffDto {
  @ApiProperty({
    description: 'Class ID to revoke access from',
    example: 'uuid-class-id',
  })
  @IsUUID()
  @Exists(Class)
  classId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to revoke class access from',
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

