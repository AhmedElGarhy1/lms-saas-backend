import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

export const ValidateCenterAccess = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    const centerId =
      request.params?.centerId ||
      request.body?.centerId ||
      request.headers['x-center-id'];

    if (!centerId) {
      throw new ForbiddenException('Center ID is required');
    }

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get PrismaService from request (injected by dependency injection)
    const prisma = request.prisma as PrismaService;

    if (!prisma) {
      throw new ForbiddenException('Database service not available');
    }

    const userOnCenter = await prisma.userOnCenter.findFirst({
      where: {
        userId: user.id,
        centerId,
      },
    });

    if (!userOnCenter) {
      throw new ForbiddenException('User is not a member of this center');
    }

    if (!userOnCenter.isActive) {
      throw new ForbiddenException('User is deactivated in this center');
    }

    return centerId;
  },
);
