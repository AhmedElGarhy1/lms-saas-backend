import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';

export class ExportCentersDto extends ExportQueryDto {
  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter by center type or category',
    required: false,
    example: 'ACADEMIC',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by location or region',
    required: false,
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
