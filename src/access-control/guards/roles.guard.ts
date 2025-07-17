import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../shared/prisma.service';

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
    // Query user roles in the given scope
    const where: any = { userId: user.id };
    if (centerId) where.centerId = centerId;
    if (teacherId) where.teacherId = teacherId;
    const userRoles = await this.prisma.userOnCenter.findMany({
      where,
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
