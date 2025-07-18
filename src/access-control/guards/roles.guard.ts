import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../shared/prisma.service';
import { RoleScope } from '../dto/create-role.dto';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    // Extract context (scopeType, scopeId) from request (body, params, or headers)
    const scopeType =
      request.body?.scopeType ||
      request.params?.scopeType ||
      request.headers['x-scope-type'] ||
      RoleScope.GLOBAL;
    const scopeId =
      request.body?.scopeId ||
      request.params?.scopeId ||
      request.headers['x-scope-id'] ||
      null;
    // Query user roles in the given scope
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id, scopeType, scopeId },
      include: { role: true },
    });
    const hasRole = userRoles.some((ur) =>
      requiredRoles.includes(ur.role.name),
    );
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
