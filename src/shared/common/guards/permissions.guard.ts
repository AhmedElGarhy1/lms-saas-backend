import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionsMetadata } from '../decorators';
import { IRequest } from '../interfaces/request.interface';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { AuthErrors } from '@/modules/auth/exceptions/auth.errors';
import { PermissionScope } from '@/modules/access-control/constants/permissions';

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

    const scope = user.centerId
      ? PermissionScope.CENTER
      : PermissionScope.ADMIN;

    const hasPermission = await this.rolesService.hasPermission(
      user.userProfileId,
      requiredPermissions.permission,
      scope,
      user.centerId,
    );

    return !!hasPermission;
  }
}
