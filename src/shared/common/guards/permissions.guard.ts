import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionsMetadata } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<PermissionsMetadata[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // TODO: Remove this after testing
    return true;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // const request = context.switchToHttp().getRequest<RequestWithUser>();
    // const user = request.user;

    // if (!user) {
    //   throw new ForbiddenException('User not authenticated');
    // }

    // const userPermissions = user.permissions || [];

    // // Check if user has all required permissions
    // const hasAllPermissions = requiredPermissions.every((permission) =>
    //   userPermissions.includes(permission),
    // );

    // if (!hasAllPermissions) {
    //   throw new ForbiddenException(
    //     `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    //   );
    // }

    // return true;
  }
}
