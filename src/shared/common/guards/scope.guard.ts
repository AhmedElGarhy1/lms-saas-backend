import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SCOPE_KEY,
  ScopeType,
} from '@/shared/common/decorators/scope.decorator';
import { RoleType, ROLE_SCOPES } from '@/shared/common/enums/role-type.enum';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { IRequest } from '../interfaces/request.interface';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControlHelperService: AccessControlHelperService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScope = this.reflector.getAllAndOverride<ScopeType>(
      SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScope) {
      return true;
    }

    const request: IRequest = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userId = user.id;

    const isAdmin = await this.accessControlHelperService.hasAdminRole(userId);

    if (isAdmin && requiredScope === 'ADMIN') return true;
    else if (!isAdmin && requiredScope === 'CENTER') return true;
    else return false;
  }
}
