import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../enums/error-codes.enum';

export class BulkOperationErrorDto {
  @ApiProperty({ description: 'The ID that failed' })
  id: string;

  @ApiProperty({
    description: 'Error code',
    enum: ErrorCode,
    required: false,
    example: ErrorCode.VALIDATION_FAILED,
  })
  code?: ErrorCode;

  @ApiProperty({
    description: 'Translated user-friendly error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Structured error details (module-specific error data)',
    required: false,
  })
  details?: unknown;

  @ApiProperty({
    description: 'Stack trace (only in development mode)',
    required: false,
  })
  stack?: string;
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
