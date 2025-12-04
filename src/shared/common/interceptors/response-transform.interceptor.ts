import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface TransformedResponse {
  success: boolean;
  data: unknown;
  message?: string;
  timestamp: string;
  path: string;
  method: string;
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      map((data) => {
        // Transform the response
        const transformedResponse: TransformedResponse = {
          success: true,
          data, // This data is already serialized by ClassSerializerInterceptor
          timestamp: new Date().toISOString(),
          path: url,
          method,
        };

        // Add message if it exists in the data
        if (data && typeof data === 'object' && 'message' in data) {
          const dataObj = data as { message?: string };
          transformedResponse.message = dataObj.message;
        }

        return transformedResponse;
      }),
    );
  }
}
