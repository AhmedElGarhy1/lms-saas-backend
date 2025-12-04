import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkRestoreGroupsDto {
  @ApiProperty({
    description: 'Array of group IDs to restore',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one group ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 group IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each group ID must be a valid UUID' })
  groupIds: string[];
}
