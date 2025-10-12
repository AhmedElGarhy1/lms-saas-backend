import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class CenterResponseDto {
  @ApiProperty({ description: 'Center ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Center name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Center description', required: false })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Center city' })
  @Expose()
  logo: string;

  @ApiProperty({ description: 'Center phone number' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'Center email' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Center website', required: false })
  @Expose()
  website?: string;

  @ApiProperty({ description: 'Whether the center is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the center is accessible to the target user',
  })
  @Expose()
  isCenterAccessible?: boolean;

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
