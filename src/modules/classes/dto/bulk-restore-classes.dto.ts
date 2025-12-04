import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkRestoreClassesDto {
  @ApiProperty({
    description: 'Array of class IDs to restore',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one class ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 class IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each class ID must be a valid UUID' })
  classIds: string[];
}
