import { ApiProperty } from '@nestjs/swagger';
import { TranslationMessage } from '../types/translation.types';

export class ApiResponseMeta {
  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp: string;

  @ApiProperty({ description: 'Unique request identifier for tracking' })
  requestId: string;

  @ApiProperty({ description: 'API version' })
  version: string;

  @ApiProperty({ description: 'Response processing time in milliseconds' })
  processingTime?: number;
}

export class PaginationMeta {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

export class ApiResponse<T> {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Optional message for the user' })
  message?: string | TranslationMessage;

  @ApiProperty({ description: 'Response metadata' })
  meta: ApiResponseMeta;
}

export class PaginatedApiResponse<T> extends ApiResponse<T[]> {
  @ApiProperty({ description: 'Pagination information' })
  pagination: PaginationMeta;
}

export class ErrorApiResponse {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: false;

  @ApiProperty({ description: 'Error message (translated)' })
  message: string;

  @ApiProperty({ description: 'Error details for debugging' })
  details?: Record<string, any>;

  @ApiProperty({ description: 'Response metadata' })
  meta: ApiResponseMeta;
}

// Helper functions for creating responses
export class ApiResponseBuilder {
  static success<T>(
    data: T,
    message?: string | TranslationMessage,
    requestId?: string,
    processingTime?: number,
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || this.generateRequestId(),
        version: '1.0.0',
        processingTime,
      },
    };
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string | TranslationMessage,
    requestId?: string,
    processingTime?: number,
  ): PaginatedApiResponse<T> {
    return {
      success: true,
      data,
      message,
      pagination: {
        ...pagination,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || this.generateRequestId(),
        version: '1.0.0',
        processingTime,
      },
    };
  }

  static error(
    message: string,
    details?: Record<string, any>,
    requestId?: string,
  ): ErrorApiResponse {
    return {
      success: false,
      message,
      details,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || this.generateRequestId(),
        version: '1.0.0',
      },
    };
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
