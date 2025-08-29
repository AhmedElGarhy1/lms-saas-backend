import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ScopeEnum } from '@/shared/common/constants/role-scope.enum';

@Injectable()
export class ScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Set scope from various sources with priority order
    request.scopeType =
      request.headers['x-scope-type'] ||
      request.body?.scopeType ||
      request.params?.scopeType ||
      request.query?.scopeType ||
      ScopeEnum.ADMIN;

    request.centerId =
      request.headers['x-center-id'] ||
      request.body?.centerId ||
      request.params?.centerId ||
      request.query?.centerId ||
      null;

    // Ensure headers are set for downstream guards
    request.headers['x-scope-type'] = request.scopeType;
    request.headers['x-center-id'] = request.centerId;

    return next.handle();
  }
}
