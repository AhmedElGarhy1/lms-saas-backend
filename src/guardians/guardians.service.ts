import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationService } from '../shared/services/base-pagination.service';

export interface CreateGuardianDto {
  emergencyContact?: string;
  relationship?: string;
  userId?: string; // Optional: if guardian should have a user account
}

export interface UpdateGuardianDto {
  emergencyContact?: string;
  relationship?: string;
}

@Injectable()
export class GuardiansService extends BasePaginationService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createGuardian(dto: CreateGuardianDto) {
    // If userId is provided, check if user exists and doesn't already have a guardian profile
    if (dto.userId) {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: {
          profile: {
            include: {
              guardian: true,
            },
          },
        },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      if (existingUser.profile && existingUser.profile.type === 'GUARDIAN') {
        throw new BadRequestException('User already has a guardian profile');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Create guardian record first
      const guardianRecord = await tx.guardian.create({
        data: {
          emergencyContact: dto.emergencyContact,
          relationship: dto.relationship,
        },
      });

      // If userId is provided, create profile record linking to guardian
      if (dto.userId) {
        await tx.profile.create({
          data: {
            userId: dto.userId,
            type: 'GUARDIAN',
            guardianId: guardianRecord.id,
          },
        });
      }

      // Return the guardian with related data
      return tx.guardian.findUnique({
        where: { id: guardianRecord.id },
        include: {
          profile: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  }

  async updateGuardian(id: string, dto: UpdateGuardianDto) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { id },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    return this.prisma.guardian.update({
      where: { id },
      data: dto,
      include: {
        profile: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getGuardian(id: string) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    return guardian;
  }

  async listGuardians(query: PaginateQuery, currentUserId: string) {
    // Get guardians that the current user has access to via UserAccess
    const userAccesses = await this.prisma.userAccess.findMany({
      where: { userId: currentUserId },
      select: { targetUserId: true },
    });

    const accessibleUserIds = userAccesses.map((access) => access.targetUserId);

    if (accessibleUserIds.length === 0) {
      return {
        data: [],
        meta: {
          itemsPerPage: query.limit || 10,
          totalItems: 0,
          currentPage: query.page || 1,
          totalPages: 0,
          sortBy: query.sortBy || [],
          searchBy: query.searchBy || [],
          search: query.search || '',
          filter: query.filter || {},
          select: [],
        },
        links: {
          first: `?page=1&limit=${query.limit || 10}`,
          previous: '',
          current: `?page=${query.page || 1}&limit=${query.limit || 10}`,
          next: '',
          last: `?page=1&limit=${query.limit || 10}`,
        },
      };
    }

    // Build where clause for guardians accessible to current user
    const where: any = {
      profile: {
        userId: { in: accessibleUserIds },
      },
    };

    // Add search filters if provided
    if (query.filter && typeof query.filter === 'object') {
      if ('emergencyContact' in query.filter && query.filter.emergencyContact) {
        where.emergencyContact = {
          contains: query.filter.emergencyContact as string,
          mode: 'insensitive',
        };
      }
      if ('relationship' in query.filter && query.filter.relationship) {
        where.relationship = {
          contains: query.filter.relationship as string,
          mode: 'insensitive',
        };
      }
    }

    // Build orderBy clause
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [guardians, total] = await Promise.all([
      this.prisma.guardian.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          profile: {
            include: {
              user: true,
            },
          },
        },
      }),
      this.prisma.guardian.count({ where }),
    ]);

    return {
      data: guardians,
      meta: {
        itemsPerPage: limit,
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        sortBy: query.sortBy || [],
        searchBy: query.searchBy || [],
        search: query.search || '',
        filter: query.filter || {},
        select: [],
      },
      links: {
        first: `?page=1&limit=${limit}`,
        previous: page > 1 ? `?page=${page - 1}&limit=${limit}` : '',
        current: `?page=${page}&limit=${limit}`,
        next:
          page < Math.ceil(total / limit)
            ? `?page=${page + 1}&limit=${limit}`
            : '',
        last: `?page=${Math.ceil(total / limit)}&limit=${limit}`,
      },
    };
  }

  async deleteGuardian(id: string) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { id },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    // Delete the guardian (this will cascade to the profile)
    await this.prisma.guardian.delete({
      where: { id },
    });

    return { message: 'Guardian deleted successfully' };
  }
}
