import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponseBuilder } from '../dto/api-response.dto';
import { ControllerResponse } from '../dto/controller-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const processingTime = Date.now() - startTime;
        const requestId = request.headers['x-request-id'] as string;

        // If data is already wrapped in our standard format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If data is a ControllerResponse, extract data and message
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          data.constructor.name === 'ControllerResponse'
        ) {
          const controllerResponse = data as ControllerResponse<any>;
          return ApiResponseBuilder.success(
            controllerResponse.data,
            controllerResponse.message,
            requestId,
            processingTime,
          );
        }

        // If data has pagination info, use paginated response
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          const { data: items, meta } = data;
          return ApiResponseBuilder.paginated(
            items,
            meta as {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            },
            'Data retrieved successfully',
            requestId,
            processingTime,
          );
        }

        // For single items, arrays, or null/undefined responses, use standard success response
        return ApiResponseBuilder.success(
          data || null, // Ensure we handle null/undefined gracefully
          this.getSuccessMessage(request.method, data),
          requestId,
          processingTime,
        ) as any;
      }),
    );
  }

  private getSuccessMessage(method: string, data: any): string {
    // If data already has a message, use it (for custom responses)
    if (data && typeof data === 'object' && 'message' in data) {
      return data.message;
    }

    // If data is null/undefined (common for DELETE operations), provide appropriate message
    if (!data) {
      const messages: Record<string, string> = {
        DELETE: 'Resource deleted successfully',
        PATCH: 'Resource updated successfully',
        PUT: 'Resource updated successfully',
        POST: 'Resource created successfully',
      };
      return messages[method] || 'Operation completed successfully';
    }

    // For arrays, provide count-specific message
    if (Array.isArray(data)) {
      return `${data.length} items retrieved successfully`;
    }

    // For objects with ID (created resources)
    if (method === 'POST' && data && data.id) {
      return 'Resource created successfully';
    }

    // For update operations
    if ((method === 'PUT' || method === 'PATCH') && data) {
      return 'Resource updated successfully';
    }

    // For delete operations
    if (method === 'DELETE') {
      return 'Resource deleted successfully';
    }

    // Default messages by method
    const messages: Record<string, string> = {
      GET: 'Data retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource updated successfully',
      DELETE: 'Resource deleted successfully',
    };

    return messages[method] || 'Operation completed successfully';
  }
}
