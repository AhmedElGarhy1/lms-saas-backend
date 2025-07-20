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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { centers: true },
    });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    this.logger.log(`Fetched profile for user ${userId}`);
    const { password: _, ...rest } = user;
    void _;
    return rest;
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
}
