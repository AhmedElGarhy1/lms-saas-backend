import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkDeleteCentersDto {
  @ApiProperty({
    description: 'Array of center IDs to delete',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one center ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 center IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each center ID must be a valid UUID' })
  centerIds: string[];
}

