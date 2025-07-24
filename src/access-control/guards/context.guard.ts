import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RoleScopeEnum } from '../constants/role-scope.enum';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    request.scopeType =
      request.body?.scopeType ||
      request.params?.scopeType ||
      request.headers['x-scope-type'] ||
      RoleScopeEnum.GLOBAL;
    request.scopeId =
      request.body?.scopeId ||
      request.params?.scopeId ||
      request.headers['x-scope-id'] ||
      null;

    // Check center-specific activation if in CENTER scope and user is authenticated
    if (user && request.scopeType === RoleScopeEnum.CENTER && request.scopeId) {
      const userOnCenter = await this.prisma.userOnCenter.findFirst({
        where: {
          userId: user.id,
          centerId: request.scopeId,
        },
      });

      if (!userOnCenter) {
        throw new ForbiddenException('User is not a member of this center');
      }

      if (!userOnCenter.isActive) {
        throw new ForbiddenException('User is deactivated in this center');
      }
    }

    return true;
  }
}
