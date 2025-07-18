import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { CurrentUser } from '../types/current-user.type';

const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUser;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    // Extract context (scopeType, scopeId) from request (body, params, or headers)
    const scopeType =
      request.body?.scopeType ||
      request.params?.scopeType ||
      request.headers['x-scope-type'] ||
      'GLOBAL';
    const scopeId =
      request.body?.scopeId ||
      request.params?.scopeId ||
      request.headers['x-scope-id'] ||
      null;
    // 1. Check per-user permission overrides
    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId: user.id, scopeType, scopeId },
      include: { permission: true },
    });
    const userPermNames = userPerms.map((up) => up.permission.action);
    if (requiredPermissions.every((perm) => userPermNames.includes(perm))) {
      return true;
    }
    // 2. Check role-based permissions
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id, scopeType, scopeId },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });
    const rolePermNames = userRoles.flatMap((ur) =>
      (ur.role.rolePermissions || []).map((rp) => rp.permission.action),
    );
    if (requiredPermissions.every((perm) => rolePermNames.includes(perm))) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
