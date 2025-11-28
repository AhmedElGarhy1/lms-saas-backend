import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '../entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class BulkRemoveRoleDto {
  @ApiProperty({
    description: 'Role ID to remove from users',
    example: 'uuid-role-id',
  })
  @IsUUID()
  @Exists(Role)
  roleId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to remove the role from',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user profile ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 user profile IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each user profile ID must be a valid UUID' })
  userProfileIds: string[];

  @ApiProperty({
    description: 'Center ID (optional)',
    required: false,
    example: 'uuid-center-id',
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}

