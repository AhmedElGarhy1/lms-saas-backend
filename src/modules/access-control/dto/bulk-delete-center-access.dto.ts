import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { Center } from '@/modules/centers/entities/center.entity';

export class BulkDeleteCenterAccessDto {
  @ApiProperty({
    description: 'Center ID',
    example: 'uuid-center-id',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to delete center access for',
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
  @HasCenterAccess({ each: true })
  userProfileIds: string[];
}
