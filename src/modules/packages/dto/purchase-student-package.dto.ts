import { IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PurchaseStudentPackageDto {
  @ApiProperty({
    description: 'Package ID to purchase',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  packageId: string;

  @ApiProperty({
    description: 'Student profile ID (optional, defaults to current user)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  studentProfileId?: string;

  @ApiProperty({
    description: 'Expiration date for the package (optional)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  expiresAt?: Date;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicate purchases',
    example: 'purchase-123456789',
    required: false,
  })
  @IsOptional()
  idempotencyKey?: string;
}

