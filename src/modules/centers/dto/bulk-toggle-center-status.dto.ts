import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsBoolean,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkToggleCenterStatusDto {
  @ApiProperty({
    description: 'Array of center IDs to toggle status',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one center ID is required' })
  @ArrayMaxSize(1000, {
    message: 'Maximum 1000 center IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each center ID must be a valid UUID' })
  centerIds: string[];

  @ApiProperty({
    description: 'Active status to set for centers',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}

