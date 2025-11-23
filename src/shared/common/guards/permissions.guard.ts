import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionsMetadata } from '../decorators';
import { IRequest } from '../interfaces/request.interface';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
    private readonly i18n: I18nService<I18nTranslations>,
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
      throw new ForbiddenException(
        this.i18n.translate('errors.userNotAuthenticated'),
      );
    }

    const hasPermission = await this.rolesService.hasPermission(
      user.userProfileId,
      requiredPermissions.permission,
      requiredPermissions.scope,
      user.centerId,
    );

    return !!hasPermission;
  }
}
