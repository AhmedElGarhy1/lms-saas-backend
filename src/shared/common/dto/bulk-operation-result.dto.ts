import { ApiProperty } from '@nestjs/swagger';

export class BulkOperationErrorDto {
  @ApiProperty({ description: 'The ID that failed' })
  id: string;

  @ApiProperty({ description: 'Error message' })
  error: string;

  @ApiProperty({ description: 'Detailed error message', required: false })
  message?: string;
}

export class BulkOperationResultDto {
  @ApiProperty({
    description: 'Type indicator for bulk operation responses',
    example: 'bulk-operation',
    enum: ['bulk-operation'],
  })
  type: 'bulk-operation';

  @ApiProperty({ description: 'Number of successful operations' })
  success: number;

  @ApiProperty({ description: 'Number of failed operations' })
  failed: number;

  @ApiProperty({ description: 'Total number of items processed' })
  total: number;

  @ApiProperty({
    description: 'Array of errors for failed operations',
    type: [BulkOperationErrorDto],
    required: false,
  })
  errors?: BulkOperationErrorDto[];
}
