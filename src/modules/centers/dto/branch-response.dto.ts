import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CenterResponseDto } from './center-response.dto';

export class BranchResponseDto {
  @ApiProperty({ description: 'Branch ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Center ID' })
  @Expose()
  centerId: string;

  @ApiProperty({ description: 'Branch city' })
  @Expose()
  city: string;

  @ApiProperty({ description: 'Branch address' })
  @Expose()
  address?: string;

  @ApiProperty({ description: 'Branch phone number' })
  @Expose()
  phone?: string;

  @ApiProperty({ description: 'Branch email' })
  @Expose()
  email?: string;

  @ApiProperty({ description: 'Branch website' })
  @Expose()
  website?: string;

  @ApiProperty({ description: 'Branch description' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Branch capacity' })
  @Expose()
  capacity?: number;

  @ApiProperty({ description: 'Branch state' })
  @Expose()
  state?: string;

  @ApiProperty({ description: 'Is branch active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Center information', type: CenterResponseDto })
  @Expose()
  @Type(() => CenterResponseDto)
  center?: CenterResponseDto;
}
