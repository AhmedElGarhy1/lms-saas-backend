import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class RoleResponseDto {
  @ApiProperty({ description: 'Role ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Role name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Role description', required: false })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Center ID (null for global roles)',
    required: false,
  })
  @Expose()
  centerId?: string;

  @ApiProperty({
    description: 'Whether the role is accessible to the target profile',
  })
  @Expose()
  isProfileAccessible?: boolean;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Updated by user ID', required: false })
  @Expose()
  updatedBy?: string;

  @ApiProperty({ description: 'Deleted by user ID', required: false })
  @Expose()
  deletedBy?: string;

  @ApiProperty({ description: 'Deletion date', required: false })
  @Expose()
  @Type(() => Date)
  deletedAt?: Date;
}
