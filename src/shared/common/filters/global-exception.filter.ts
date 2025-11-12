import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request, Response } from 'express';
import { EnhancedErrorResponse } from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: EnhancedErrorResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // If it's already our custom exception format, use it
      if (
        typeof exceptionResponse === 'object' &&
        'userMessage' in exceptionResponse
      ) {
        errorResponse = exceptionResponse as EnhancedErrorResponse;
      } else {
        // Convert standard NestJS exceptions to our format
        errorResponse = this.convertToStandardFormat(
          status,
          exceptionResponse,
          request,
        );
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.createInternalServerErrorResponse(
        request,
        exception,
      );
    }

    // Log the error
    this.logError(exception, request, errorResponse);

    // Send the standardized response
    response.status(status).json(errorResponse);
  }

  private convertToStandardFormat(
    status: number,
    exceptionResponse: string | object,
    request: Request,
  ): EnhancedErrorResponse {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'An error occurred';

    const userMessage = this.getUserFriendlyMessage(status, message);
    const actionRequired = this.getActionRequired(status, message);

    return {
      statusCode: status,
      message,
      error: this.getErrorType(status),
      code: this.getErrorCode(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userMessage,
      actionRequired,
      retryable: this.isRetryable(status),
    };
  }

  private createInternalServerErrorResponse(
    request: Request,
    exception: unknown,
  ): EnhancedErrorResponse {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userMessage: 'An unexpected error occurred',
      actionRequired: 'Please try again later or contact support',
      retryable: true,
    };
  }

  private getUserFriendlyMessage(status: number, message: string): string {
    const friendlyMessages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Please check your input and try again',
      [HttpStatus.UNAUTHORIZED]: 'Please log in to continue',
      [HttpStatus.FORBIDDEN]:
        'You do not have permission to perform this action',
      [HttpStatus.NOT_FOUND]: 'The requested resource was not found',
      [HttpStatus.CONFLICT]: 'This action conflicts with existing data',
      [HttpStatus.UNPROCESSABLE_ENTITY]:
        'The provided data could not be processed',
      [HttpStatus.TOO_MANY_REQUESTS]:
        'Too many requests. Please try again later',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
      [HttpStatus.SERVICE_UNAVAILABLE]:
        'The service is temporarily unavailable',
    };

    return friendlyMessages[status] || 'An error occurred';
  }

  private getActionRequired(status: number, message: string): string {
    const actions: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Fix the highlighted errors and try again',
      [HttpStatus.UNAUTHORIZED]: 'Please provide valid credentials',
      [HttpStatus.FORBIDDEN]: 'Contact an administrator for access',
      [HttpStatus.NOT_FOUND]: 'Check the resource ID and try again',
      [HttpStatus.CONFLICT]:
        'Use different information or update existing data',
      [HttpStatus.UNPROCESSABLE_ENTITY]:
        'Check your input format and try again',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Wait before making another request',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Try again later or contact support',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Try again later',
    };

    return actions[status] || 'Please try again';
  }

  private getErrorType(status: number): string {
    const errorTypes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return errorTypes[status] || 'Error';
  }

  private getErrorCode(status: number): ErrorCode {
    const errorCodes: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE_ENTITY,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    };

    return errorCodes[status] || ErrorCode.UNKNOWN_ERROR;
  }

  private isRetryable(status: number): boolean {
    const retryableStatuses = [
      HttpStatus.BAD_REQUEST,
      HttpStatus.UNAUTHORIZED,
      HttpStatus.CONFLICT,
      HttpStatus.UNPROCESSABLE_ENTITY,
      HttpStatus.TOO_MANY_REQUESTS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE,
    ];

    return retryableStatuses.includes(status);
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: EnhancedErrorResponse,
  ): void {
    const errorContext = {
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      statusCode: errorResponse.statusCode,
      message: errorResponse.message,
    };

    if (exception instanceof HttpException) {
      this.logger.warn(
        `HTTP Exception occurred - ${JSON.stringify(errorContext)}`,
      );
    } else {
      if (exception instanceof Error) {
        this.logger.error(
          `Unexpected error occurred - ${JSON.stringify(errorContext)}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      } else {
        this.logger.error(
          `Unexpected error occurred - ${JSON.stringify({ ...errorContext, error: String(exception) })}`,
        );
      }
    }
  }
}
