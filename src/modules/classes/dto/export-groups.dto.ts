import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExportFormat } from '@/shared/common/dto/export-query.dto';
import { PaginateGroupsDto } from './paginate-groups.dto';

export class ExportGroupsDto extends PaginateGroupsDto {
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
    example: 'groups-export',
  })
  @IsOptional()
  @IsString()
  filename?: string;
}
