import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';

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

    // Get DataSource from request (injected by dependency injection)
    const dataSource = request.dataSource as DataSource;

    if (!dataSource) {
      throw new ForbiddenException('Database service not available');
    }

    const userOnCenter = await dataSource.getRepository(UserOnCenter).findOne({
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
