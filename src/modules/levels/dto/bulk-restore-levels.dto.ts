import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkRestoreLevelsDto {
  @ApiProperty({
    description: 'Array of level IDs to restore',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one level ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 level IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each level ID must be a valid UUID' })
  levelIds: string[];
}

