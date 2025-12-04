import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExportFormat } from '@/shared/common/dto/export-query.dto';
import { PaginateClassesDto } from './paginate-classes.dto';

export class ExportClassesDto extends PaginateClassesDto {
  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    example: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({
    description: 'Custom filename (without extension)',
    required: false,
    example: 'classes-export',
  })
  @IsOptional()
  @IsString()
  filename?: string;
}
