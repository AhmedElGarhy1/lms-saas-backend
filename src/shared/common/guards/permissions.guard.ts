import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionsMetadata } from '../decorators';
import { IRequest } from '../interfaces/request.interface';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { AuthErrors } from '@/modules/auth/exceptions/auth.errors';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<PermissionsMetadata>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions || !requiredPermissions.permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IRequest>();
    const user = request.user;

    if (!user) {
      throw AuthErrors.authenticationRequired();
    }

    const hasPermission = await this.rolesService.hasPermission(
      user.userProfileId,
      requiredPermissions.permission,
      requiredPermissions.scope,
      user.centerId,
    );
    console.log(
      user.userProfileId,
      requiredPermissions.permission,
      requiredPermissions.scope,
      user.centerId,
    );
    console.log(hasPermission);

    return !!hasPermission;
  }
}
