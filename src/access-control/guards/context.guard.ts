import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RoleScope } from '../dto/create-role.dto';

@Injectable()
export class ContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.scopeType =
      request.body?.scopeType ||
      request.params?.scopeType ||
      request.headers['x-scope-type'] ||
      RoleScope.GLOBAL;
    request.scopeId =
      request.body?.scopeId ||
      request.params?.scopeId ||
      request.headers['x-scope-id'] ||
      null;
    return true;
  }
}
