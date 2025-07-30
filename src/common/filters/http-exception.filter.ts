import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../shared/services/logger.service';
import { EnhancedErrorResponse } from '../exceptions/custom.exceptions';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse() as EnhancedErrorResponse;

    // Add request context to the error response
    const enhancedResponse: EnhancedErrorResponse = {
      ...errorResponse,
      path: request.url,
      method: request.method,
    };

    // Log the error with context
    this.logger.error(
      `HTTP Exception: ${exception.message}`,
      exception.stack,
      'HttpExceptionFilter',
      {
        statusCode: status,
        path: request.url,
        method: request.method,
        userId: request.user?.id,
        userEmail: request.user?.email,
      },
    );

    response.status(status).json(enhancedResponse);
  }
}
