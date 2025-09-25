import { ApiProperty } from '@nestjs/swagger';

export class CenterResponseDto {
  @ApiProperty({ description: 'Center ID' })
  id: string;

  @ApiProperty({ description: 'Center name' })
  name: string;

  @ApiProperty({ description: 'Center description' })
  description?: string;

  @ApiProperty({ description: 'Center address' })
  address?: string;

  @ApiProperty({ description: 'Center phone number' })
  phone?: string;

  @ApiProperty({ description: 'Center email' })
  email?: string;

  @ApiProperty({ description: 'Center website' })
  website?: string;

  @ApiProperty({ description: 'Whether center is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Center owner ID' })
  ownerId: string;

  @ApiProperty({ description: 'Center creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Center last update date' })
  updatedAt: Date;
}

export class CenterListResponseDto {
  @ApiProperty({ description: 'List of centers' })
  data: CenterResponseDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class CenterStatsResponseDto {
  @ApiProperty({ description: 'Total number of centers' })
  totalCenters: number;

  @ApiProperty({ description: 'Number of active centers' })
  activeCenters: number;

  @ApiProperty({ description: 'Number of inactive centers' })
  inactiveCenters: number;
}

export class CreateCenterResponseDto {
  @ApiProperty({ description: 'Center ID' })
  id: string;

  @ApiProperty({ description: 'Center name' })
  name: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class UpdateCenterResponseDto {
  @ApiProperty({ description: 'Center ID' })
  id: string;

  @ApiProperty({ description: 'Center name' })
  name: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class CenterUserAssignmentDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Center ID' })
  centerId: string;

  @ApiProperty({ description: 'Assignment success' })
  success: boolean;

  @ApiProperty({ description: 'Assignment message' })
  message: string;
}
