import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GrantCenterAccessRequestDto } from './dto/grant-center-access.dto';

@Injectable()
export class CenterAccessService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Grant center access to a user
   */
  async grantCenterAccess(
    centerId: string,
    dto: GrantCenterAccessRequestDto,
    createdBy: string,
  ) {
    // Validate center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt) {
      throw new NotFoundException('Center not found');
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role exists and belongs to this center
    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        scope: 'CENTER',
        centerId,
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found for this center');
    }

    // Check if user already has access to this center
    const existingAccess = await this.prisma.userOnCenter.findFirst({
      where: {
        userId: dto.userId,
        centerId,
      },
    });

    if (existingAccess) {
      throw new BadRequestException('User already has access to this center');
    }

    // Grant access
    const userOnCenter = await this.prisma.userOnCenter.create({
      data: {
        userId: dto.userId,
        centerId,
        roleId: dto.roleId,
        createdBy,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Granted center access: User ${dto.userId} to Center ${centerId} with role ${dto.roleId} by ${createdBy}`,
    );

    return userOnCenter;
  }

  /**
   * Revoke center access from a user
   */
  async revokeCenterAccess(
    centerId: string,
    userId: string,
    revokedBy: string,
  ) {
    // Validate center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt) {
      throw new NotFoundException('Center not found');
    }

    // Find the user's access to this center
    const userOnCenter = await this.prisma.userOnCenter.findFirst({
      where: {
        userId,
        centerId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userOnCenter) {
      throw new NotFoundException('User does not have access to this center');
    }

    // Prevent revoking access from center owner
    if (center.ownerId === userId) {
      throw new ForbiddenException('Cannot revoke access from center owner');
    }

    // Revoke access
    await this.prisma.userOnCenter.delete({
      where: { id: userOnCenter.id },
    });

    this.logger.log(
      `Revoked center access: User ${userId} from Center ${centerId} by ${revokedBy}`,
    );

    return {
      message: 'Center access revoked successfully',
      user: userOnCenter.user,
      role: userOnCenter.role,
    };
  }

  /**
   * Get user's center access details
   */
  async getUserCenterAccess(centerId: string, userId: string) {
    const userOnCenter = await this.prisma.userOnCenter.findFirst({
      where: {
        userId,
        centerId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            isAdmin: true,
            permissions: true,
          },
        },
      },
    });

    if (!userOnCenter) {
      throw new NotFoundException('User does not have access to this center');
    }

    return userOnCenter;
  }

  /**
   * List all users with access to a center
   */
  async listCenterUsers(centerId: string) {
    // Validate center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt) {
      throw new NotFoundException('Center not found');
    }

    const users = await this.prisma.userOnCenter.findMany({
      where: { centerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
            profile: {
              select: {
                type: true,
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            isAdmin: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((userOnCenter) => ({
      ...userOnCenter,
      userType: userOnCenter.user.profile?.type || 'Base User',
    }));
  }

  /**
   * Get user's active centers
   */
  async getUserCenters(userId: string) {
    const userCenters = await this.prisma.userOnCenter.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            location: true,
            description: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            isAdmin: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return userCenters;
  }
}
