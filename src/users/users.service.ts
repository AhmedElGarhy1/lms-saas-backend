import {
  Injectable,
  Inject,
  LoggerService,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginateQuery } from 'nestjs-paginate';
import { CreateUserRequest } from './dto/create-user.dto';
import { UpdateProfileRequest } from './dto/update-profile.dto';
import { ChangePasswordRequest } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { RoleScopeEnum } from 'src/access-control/constants/role-scope.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async getProfile(
    userId: string,
    scopeType: RoleScopeEnum = RoleScopeEnum.GLOBAL,
    scopeId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        centers: {
          include: {
            center: true,
            role: true,
          },
        },
        userPermissions: {
          where: {
            scopeType,
            scopeId: scopeType === RoleScopeEnum.CENTER ? scopeId : null,
          },
          include: { permission: true },
        },
        userRoles: {
          where: {
            scopeType,
            scopeId: scopeType === RoleScopeEnum.CENTER ? scopeId : null,
          },
          include: { role: true },
        },
      },
    });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    this.logger.log(`Fetched profile for user ${userId}`);
    const { password: _, userPermissions, userRoles, centers, ...rest } = user;
    void _;
    // Aggregate permissions (reuse logic from getUserPermissions)
    const direct = userPermissions.map((up) => up.permission.action);
    const rolePerms = userRoles.flatMap((ur) => {
      if (!ur.role.permissions) return [];
      let perms: any[] = [];
      if (Array.isArray(ur.role.permissions)) {
        perms = ur.role.permissions;
      } else if (typeof ur.role.permissions === 'string') {
        try {
          perms = JSON.parse(ur.role.permissions);
        } catch {
          perms = [];
        }
      }
      return perms.map((p: any) => p.action || p);
    });
    const allPermissions = Array.from(new Set([...direct, ...rolePerms]));
    // Format centers: group by centerId, collect all roles for that center
    const centersMap: Record<string, { center: any; roles: any[] }> = {};
    for (const c of centers) {
      if (!centersMap[c.centerId]) {
        centersMap[c.centerId] = { center: c.center, roles: [] };
      }
      if (c.role) {
        // Only include role id, name, scope, centerId
        centersMap[c.centerId].roles.push({
          id: c.role.id,
          name: c.role.name,
          scope: c.role.scope,
          centerId: c.role.centerId,
        });
      }
    }
    const centersArr = Object.values(centersMap).map((c) => ({
      center: c.center,
      roles: c.roles,
    }));
    // Format roles: only roles for the current scope, no permissions
    const rolesArr = userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      scope: ur.role.scope,
      centerId: ur.role.centerId,
    }));
    return {
      ...rest,
      centers: centersArr,
      roles: rolesArr,
      permissions: allPermissions,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    // Map fullName to name for the User model
    const updateData: { name?: string } = {};
    if (dto.fullName !== undefined) {
      updateData.name = dto.fullName;
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    this.logger.log(`Updated profile for user ${userId}`);
    const { password: __, ...restUpdated } = updated;
    void __;
    return restUpdated;
  }

  async changePassword(userId: string, dto: ChangePasswordRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    const valid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!valid) {
      this.logger.warn(`Invalid old password for user ${userId}`);
      throw new ForbiddenException('Invalid old password');
    }
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
    this.logger.log(`Changed password for user ${userId}`);
    return { message: 'Password changed successfully' };
  }

  async createUser(dto: CreateUserRequest) {
    let password = dto.password;
    if (!password) {
      password = Math.random().toString(36).slice(-8) + Date.now();
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.fullName,
        password: hash,
        isActive: true,
      },
      include: {
        centers: true,
        userPermissions: true,
        teacherUsers: true,
      },
    });
    this.logger.log(`Created user ${user.email} (${user.id})`);
    const { password: _, ...rest } = user;
    void _;
    return rest;
  }

  async listUsers(query: PaginateQuery): Promise<any> {
    const where: any = {};
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'name' in query.filter
    ) {
      where.name = {
        contains: query.filter.name as string,
        mode: 'insensitive',
      };
    }
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          centers: {
            include: { center: true, role: true },
          },
          userPermissions: true,
          teacherUsers: {
            include: { role: true, teacher: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns users the current user has access to, optionally filtered by type (e.g., 'Teacher', 'Student').
   */
  async getAccessibleUsers(
    currentUserId: string,
    type?: 'Teacher' | 'Student',
  ): Promise<any[]> {
    // Find all targetUserIds this user can access
    const accesses = await this.prisma.userAccess.findMany({
      where: { userId: currentUserId },
      include: { targetUser: true },
    });
    // Optionally filter by type
    return accesses
      .filter((a) => (type ? a.targetUser.type === type : true))
      .map((a) => a.targetUser);
  }

  async getUserPermissions(
    userId: string,
    scopeType: RoleScopeEnum = RoleScopeEnum.GLOBAL,
    scopeId?: string,
  ) {
    // 1. Direct user permissions in this scope
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          where: {
            scopeType,
            scopeId: scopeType === RoleScopeEnum.CENTER ? scopeId : null,
          },
          include: { permission: true },
        },
        userRoles: {
          where: {
            scopeType,
            scopeId: scopeType === 'CENTER' ? scopeId : null,
          },
          include: { role: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // 2. Aggregate direct permissions
    const direct = user.userPermissions.map((up) => up.permission.action);

    // 3. Aggregate all permissions from all roles in this scope
    const rolePerms = user.userRoles.flatMap((ur) => {
      if (!ur.role.permissions) return [];
      let perms: any[] = [];
      if (Array.isArray(ur.role.permissions)) {
        perms = ur.role.permissions;
      } else if (typeof ur.role.permissions === 'string') {
        try {
          perms = JSON.parse(ur.role.permissions);
        } catch {
          perms = [];
        }
      }
      return perms.map((p: any) => p.action || p);
    });

    // 4. Combine and deduplicate
    const all = Array.from(new Set([...direct, ...rolePerms]));
    return all;
  }
}
