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
import { TranslationMessage } from '../types/translation.types';
import { I18nPath } from '@/generated/i18n.generated';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor() {}

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
        // Check both instanceof and structure (in case it was converted to plain object by another interceptor)
        if (
          data instanceof ControllerResponse ||
          (data &&
            typeof data === 'object' &&
            'data' in data &&
            'message' in data &&
            !('success' in data) &&
            !('meta' in data) &&
            (data.constructor.name === 'ControllerResponse' ||
              (typeof (data as any).message === 'object' &&
                (data as any).message !== null &&
                'key' in (data as any).message)))
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
            { key: 't.success.dataRetrieved' },
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

  private getSuccessMessage(
    method: string,
    data: any,
  ): string | TranslationMessage {
    // If data already has a message, use it (for custom responses)
    if (data && typeof data === 'object' && 'message' in data) {
      return data.message;
    }

    // Store translation keys only - TranslationResponseInterceptor will translate them
    // If data is null/undefined (common for DELETE operations), provide appropriate message key
    if (!data) {
      const messages: Record<string, TranslationMessage> = {
        DELETE: { key: 't.success.delete', args: undefined },
        PATCH: { key: 't.success.update', args: undefined },
        PUT: { key: 't.success.update', args: undefined },
        POST: { key: 't.success.create', args: undefined },
      };
      return messages[method] || { key: 't.success.operation', args: undefined };
    }

    // For arrays, provide count-specific message key
    if (Array.isArray(data)) {
      return { key: 't.success.dataRetrieved', args: undefined };
    }

    // For objects with ID (created resources)
    if (method === 'POST' && data && data.id) {
      return { key: 't.success.create', args: undefined };
    }

    // For update operations
    if ((method === 'PUT' || method === 'PATCH') && data) {
      return { key: 't.success.update', args: undefined };
    }

    // For delete operations
    if (method === 'DELETE') {
      return { key: 't.success.delete', args: undefined };
    }

    // Default messages by method
    const messages: Record<string, TranslationMessage> = {
      GET: { key: 't.success.dataRetrieved', args: undefined },
      POST: { key: 't.success.create', args: undefined },
      PUT: { key: 't.success.update', args: undefined },
      PATCH: { key: 't.success.update', args: undefined },
      DELETE: { key: 't.success.delete', args: undefined },
    };

      return messages[method] || { key: 't.success.operation', args: undefined };
  }
}
