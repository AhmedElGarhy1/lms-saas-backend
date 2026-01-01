import { ApiProperty } from '@nestjs/swagger';

export class ExportResponseDto {
  @ApiProperty({
    description: 'Success status of the export operation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Export completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Filename of the exported file',
    example: 'users_2024-01-15T10-30-45-123Z.csv',
  })
  filename: string;

  @ApiProperty({
    description: 'Export format used',
    example: 'csv',
  })
  format: string;

  @ApiProperty({
    description: 'Number of records exported',
    example: 150,
  })
  recordCount: number;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024,
  })
  fileSize?: number;

  @ApiProperty({
    description: 'Export completion timestamp',
    example: '2024-01-15T10:30:45.123Z',
  })
  exportedAt: string;
}
