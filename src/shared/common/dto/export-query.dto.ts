import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
}

export class ExportQueryDto {
  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.CSV,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.CSV;

  @ApiProperty({
    description: 'Custom filename (without extension)',
    required: false,
    example: 'users-export',
  })
  @IsOptional()
  @IsString()
  filename?: string;
}
