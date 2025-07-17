import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../shared/prisma.service';

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
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    // Extract scope from request (centerId or teacherId)
    const { centerId, teacherId } = request.body || {};
    if (!centerId && !teacherId) {
      throw new ForbiddenException('Scope (centerId or teacherId) is required');
    }
    if (centerId && teacherId) {
      throw new ForbiddenException(
        'Only one scope allowed (centerId or teacherId)',
      );
    }
    // 1. Check per-user permission overrides
    const userPermWhere: any = { userId: user.id };
    if (centerId) userPermWhere.centerId = centerId;
    if (teacherId) userPermWhere.teacherId = teacherId;
    const userPerms = await this.prisma.userPermission.findMany({
      where: userPermWhere,
      include: { permission: true },
    });
    const userPermNames = userPerms.map((up) => up.permission.name);
    if (requiredPermissions.every((perm) => userPermNames.includes(perm))) {
      return true;
    }
    // 2. Check role-based permissions
    const userRoles = await this.prisma.userOnCenter.findMany({
      where: userPermWhere,
      include: { role: { include: { permissions: true } } },
    });
    const rolePermNames = userRoles.flatMap((ur) =>
      ur.role.permissions.map((p) => p.name),
    );
    if (requiredPermissions.every((perm) => rolePermNames.includes(perm))) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
