import { IsString, IsInt, IsUUID, IsPositive, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateClassPackageDto {
  @ApiProperty({
    description: 'Class ID for this package',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  classId: string;

  @ApiProperty({
    description: 'Package name',
    example: 'Monthly Bundle - 8 Sessions',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Number of sessions in this package',
    example: 8,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  sessionCount: number;

  @ApiProperty({
    description: 'Price in cents (e.g., 5000 for $50.00)',
    example: 5000,
  })
  @Transform(({ value }) => value / 100) // Convert cents to dollars
  price: number;

  @ApiProperty({
    description: 'Whether the package is active for purchase',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value ?? true)
  isActive?: boolean;
}

