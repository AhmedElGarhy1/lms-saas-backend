import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkDeleteRolesDto {
  @ApiProperty({
    description: 'Array of role IDs to delete',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one role ID is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 role IDs allowed per request' })
  @IsUUID(4, { each: true, message: 'Each role ID must be a valid UUID' })
  roleIds: string[];
}

