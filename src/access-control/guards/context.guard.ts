import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RoleScopeEnum } from '../constants/role-scope.enum';

@Injectable()
export class ContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.scopeType =
      request.body?.scopeType ||
      request.params?.scopeType ||
      request.headers['x-scope-type'] ||
      RoleScopeEnum.GLOBAL;
    request.scopeId =
      request.body?.scopeId ||
      request.params?.scopeId ||
      request.headers['x-scope-id'] ||
      null;
    return true;
  }
}
