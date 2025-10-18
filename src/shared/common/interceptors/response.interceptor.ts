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
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

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
      const resourceName = this.i18n.translate('common.resources.resource');
      const messages: Record<string, string> = {
        DELETE: this.i18n.translate('success.delete', {
          args: { resource: resourceName },
        }),
        PATCH: this.i18n.translate('success.update', {
          args: { resource: resourceName },
        }),
        PUT: this.i18n.translate('success.update', {
          args: { resource: resourceName },
        }),
        POST: this.i18n.translate('success.create', {
          args: { resource: resourceName },
        }),
      };
      return messages[method] || this.i18n.translate('api.success.operation');
    }

    // For arrays, provide count-specific message
    if (Array.isArray(data)) {
      return this.i18n.translate('success.dataRetrieved', {
        args: { count: data.length },
      });
    }

    // For objects with ID (created resources)
    if (method === 'POST' && data && data.id) {
      const resourceName = this.i18n.translate('common.resources.resource');
      return this.i18n.translate('success.create', {
        args: { resource: resourceName },
      });
    }

    // For update operations
    if ((method === 'PUT' || method === 'PATCH') && data) {
      const resourceName = this.i18n.translate('common.resources.resource');
      return this.i18n.translate('success.update', {
        args: { resource: resourceName },
      });
    }

    // For delete operations
    if (method === 'DELETE') {
      const resourceName = this.i18n.translate('common.resources.resource');
      return this.i18n.translate('success.delete', {
        args: { resource: resourceName },
      });
    }

    // Default messages by method
    const resourceName = this.i18n.translate('common.resources.resource');
    const messages: Record<string, string> = {
      GET: this.i18n.translate('success.dataRetrieved'),
      POST: this.i18n.translate('success.create', {
        args: { resource: resourceName },
      }),
      PUT: this.i18n.translate('success.update', {
        args: { resource: resourceName },
      }),
      PATCH: this.i18n.translate('success.update', {
        args: { resource: resourceName },
      }),
      DELETE: this.i18n.translate('success.delete', {
        args: { resource: resourceName },
      }),
    };

    return messages[method] || this.i18n.translate('api.success.operation');
  }
}
