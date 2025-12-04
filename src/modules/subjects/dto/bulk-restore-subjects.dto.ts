import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkRestoreSubjectsDto {
  @ApiProperty({
    description: 'Array of subject IDs to restore',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one subject ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 subject IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each subject ID must be a valid UUID' })
  subjectIds: string[];
}
