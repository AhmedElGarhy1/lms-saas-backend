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

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only apply response transformation to API routes
    if (!request.url.startsWith('/api')) {
      return next.handle();
    }

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
              (typeof data.message === 'object' &&
                data.message !== null &&
                'key' in data.message)))
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
            {
              key: 't.messages.found',
              args: { resource: 't.resources.resource' },
            },
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
        DELETE: {
          key: 't.messages.deleted',
          args: { resource: 't.resources.resource' },
        },
        PATCH: {
          key: 't.messages.updated',
          args: { resource: 't.resources.resource' },
        },
        PUT: {
          key: 't.messages.updated',
          args: { resource: 't.resources.resource' },
        },
        POST: {
          key: 't.messages.created',
          args: { resource: 't.resources.resource' },
        },
      };
      return (
        messages[method] || {
          key: 't.messages.operationSuccess',
        }
      );
    }

    // For arrays, provide count-specific message key
    if (Array.isArray(data)) {
      return {
        key: 't.messages.found',
        args: { resource: 't.resources.resource' },
      };
    }

    // For objects with ID (created resources)
    if (method === 'POST' && data && data.id) {
      return {
        key: 't.messages.created',
        args: { resource: 't.resources.resource' },
      };
    }

    // For update operations
    if ((method === 'PUT' || method === 'PATCH') && data) {
      return {
        key: 't.messages.updated',
        args: { resource: 't.resources.resource' },
      };
    }

    // For delete operations
    if (method === 'DELETE') {
      return {
        key: 't.messages.deleted',
        args: { resource: 't.resources.resource' },
      };
    }

    // Default messages by method
    const messages: Record<string, TranslationMessage> = {
      GET: {
        key: 't.messages.found',
        args: { resource: 't.resources.resource' },
      },
      POST: {
        key: 't.messages.created',
        args: { resource: 't.resources.resource' },
      },
      PUT: {
        key: 't.messages.updated',
        args: { resource: 't.resources.resource' },
      },
      PATCH: {
        key: 't.messages.updated',
        args: { resource: 't.resources.resource' },
      },
      DELETE: {
        key: 't.messages.deleted',
        args: { resource: 't.resources.resource' },
      },
    };

    return (
      messages[method] || {
        key: 't.messages.operationSuccess',
      }
    );
  }
}
