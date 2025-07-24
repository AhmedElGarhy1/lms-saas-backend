import {
  Injectable,
  Inject,
  LoggerService,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationService } from '../shared/services/base-pagination.service';
import { RoleScopeEnum } from 'src/access-control/constants/role-scope.enum';
import { RoleScope, ProfileType } from '@prisma/client';
import { CreateUserRequestDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ChangePasswordRequestDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService extends BasePaginationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    super();
  }

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
        profile: {
          include: {
            teacher: true,
            student: true,
            guardian: true,
            baseUser: true,
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
    const {
      password: _,
      userPermissions,
      userRoles,
      centers,
      profile,
      ...rest
    } = user;
    void _;

    // Check if user has global admin access
    const globalAdminRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        scopeType: RoleScopeEnum.GLOBAL,
        role: {
          isAdmin: true,
        },
      },
      include: { role: true },
    });

    const isAdmin = globalAdminRoles.length > 0;

    // Check if user has admin access in current scope
    const currentScopeAdminRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        scopeType,
        scopeId: scopeType === RoleScopeEnum.CENTER ? scopeId : null,
        role: {
          isAdmin: true,
        },
      },
      include: { role: true },
    });

    const isAdminNow = currentScopeAdminRoles.length > 0;

    // Aggregate permissions for current scope only
    // userPermissions and userRoles are already filtered by current scope in the query above
    const direct = userPermissions.map((up) => up.permission.action);
    const rolePerms = userRoles.flatMap((ur) => {
      const rolePerms = ur.role.permissions as any;
      return rolePerms ? rolePerms.map((p: any) => p.action) : [];
    });
    const permissions = [...new Set([...direct, ...rolePerms])];

    // Transform centers to include essential data
    const transformedCenters = centers.map((center) => ({
      id: center.center.id,
      name: center.center.name,
      role: {
        id: center.role.id,
        name: center.role.name,
      },
      isActive: center.isActive, // Shows user's activation status in this center
    }));

    // Determine user type and profile data based on profile type
    let userType = 'Base User';
    let profileData = null;

    if (profile) {
      switch (profile.type) {
        case ProfileType.TEACHER:
          userType = 'Teacher';
          profileData = profile.teacher;
          break;
        case ProfileType.STUDENT:
          userType = 'Student';
          profileData = profile.student;
          break;
        case ProfileType.GUARDIAN:
          userType = 'Guardian';
          profileData = profile.guardian;
          break;
        case ProfileType.BASE_USER:
          userType = 'Base User';
          profileData = profile.baseUser;
          break;
      }
    }

    return {
      ...rest,
      userType,
      profile: profileData,
      centers: transformedCenters,
      context: {
        roles: userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          scope: ur.scopeType,
          centerId: ur.scopeId,
        })),
        permissions,
        isAdmin: isAdminNow,
      },
      isAdmin,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Handle legacy fullName update
    if ('fullName' in dto && dto.fullName !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.fullName },
      });
    }

    // Handle profile-specific updates
    if ('type' in dto) {
      if (!user.profile) {
        throw new BadRequestException('User does not have a profile to update');
      }

      // Update common profile fields
      const profileUpdateData: any = {};
      if ('phone' in dto && dto.phone !== undefined)
        profileUpdateData.phone = dto.phone;
      if ('address' in dto && dto.address !== undefined)
        profileUpdateData.address = dto.address;
      if ('dateOfBirth' in dto && dto.dateOfBirth !== undefined)
        profileUpdateData.dateOfBirth = dto.dateOfBirth;
      if ('gender' in dto && dto.gender !== undefined)
        profileUpdateData.gender = dto.gender;
      if ('avatar' in dto && dto.avatar !== undefined)
        profileUpdateData.avatar = dto.avatar;

      // Update profile
      await this.prisma.profile.update({
        where: { id: user.profile.id },
        data: profileUpdateData,
      });

      // Update specific profile type data
      switch (dto.type) {
        case ProfileType.TEACHER:
          if (user.profile.teacherId) {
            const teacherUpdateData: any = {};
            if ('biography' in dto && dto.biography !== undefined)
              teacherUpdateData.biography = dto.biography;
            if ('experienceYears' in dto && dto.experienceYears !== undefined)
              teacherUpdateData.experienceYears = dto.experienceYears;
            if ('specialization' in dto && dto.specialization !== undefined)
              teacherUpdateData.specialization = dto.specialization;

            if (Object.keys(teacherUpdateData).length > 0) {
              await this.prisma.teacher.update({
                where: { id: user.profile.teacherId },
                data: teacherUpdateData,
              });
            }
          }
          break;
        case ProfileType.STUDENT:
          if (user.profile.studentId) {
            const studentUpdateData: any = {};
            if ('grade' in dto && dto.grade !== undefined)
              studentUpdateData.grade = dto.grade;
            if ('level' in dto && dto.level !== undefined)
              studentUpdateData.level = dto.level;
            if ('performanceScore' in dto && dto.performanceScore !== undefined)
              studentUpdateData.performanceScore = dto.performanceScore;
            if ('notes' in dto && dto.notes !== undefined)
              studentUpdateData.notes = dto.notes;
            if ('gradeLevelId' in dto && dto.gradeLevelId !== undefined)
              studentUpdateData.gradeLevelId = dto.gradeLevelId;

            if (Object.keys(studentUpdateData).length > 0) {
              await this.prisma.student.update({
                where: { id: user.profile.studentId },
                data: studentUpdateData,
              });
            }
          }
          break;
        case ProfileType.GUARDIAN:
          if (user.profile.guardianId) {
            const guardianUpdateData: any = {};
            if ('emergencyContact' in dto && dto.emergencyContact !== undefined)
              guardianUpdateData.emergencyContact = dto.emergencyContact;
            if ('relationship' in dto && dto.relationship !== undefined)
              guardianUpdateData.relationship = dto.relationship;

            if (Object.keys(guardianUpdateData).length > 0) {
              await this.prisma.guardian.update({
                where: { id: user.profile.guardianId },
                data: guardianUpdateData,
              });
            }
          }
          break;
      }
    }

    // Return updated user
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            teacher: true,
            student: true,
            guardian: true,
            baseUser: true,
          },
        },
      },
    });

    return updated;
  }

  async createProfile(userId: string, dto: CreateProfileDto) {
    // Check if user already has a profile
    const existingProfile = await this.prisma.profile.findFirst({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException('User already has a profile');
    }

    const profileData: any = {
      userId,
      type: dto.type,
    };

    // Create specific profile based on type
    switch (dto.type) {
      case ProfileType.TEACHER:
        const teacherDto = dto as any;
        const teacher = await this.prisma.teacher.create({
          data: {
            biography: teacherDto.biography,
            experienceYears: teacherDto.experienceYears,
            specialization: teacherDto.specialization,
          },
        });
        profileData.teacherId = teacher.id;
        break;

      case ProfileType.STUDENT:
        const studentDto = dto as any;
        const student = await this.prisma.student.create({
          data: {
            grade: studentDto.grade,
            level: studentDto.level,
            performanceScore: studentDto.performanceScore,
            notes: studentDto.notes,
            gradeLevelId: studentDto.gradeLevelId,
          },
        });
        profileData.studentId = student.id;
        break;

      case ProfileType.GUARDIAN:
        const guardianDto = dto as any;
        const guardian = await this.prisma.guardian.create({
          data: {
            emergencyContact: guardianDto.emergencyContact,
            relationship: guardianDto.relationship,
          },
        });
        profileData.guardianId = guardian.id;
        break;

      case ProfileType.BASE_USER:
        const baseUser = await this.prisma.baseUser.create({
          data: {},
        });
        profileData.baseUserId = baseUser.id;
        break;

      default:
        throw new BadRequestException('Invalid profile type');
    }

    const profile = await this.prisma.profile.create({
      data: profileData,
      include: {
        teacher: true,
        student: true,
        guardian: true,
        baseUser: true,
      },
    });

    this.logger.log(`Created ${dto.type} profile for user ${userId}`);
    return profile;
  }

  async changePassword(userId: string, dto: ChangePasswordRequestDto) {
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

  async createUser(dto: CreateUserRequestDto, createdBy?: string) {
    let password = dto.password;
    if (!password) {
      password = Math.random().toString(36).slice(-8) + Date.now();
    }
    const hash = await bcrypt.hash(password, 10);

    // Validate role if provided
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // Validate scope if provided
      if (dto.scopeType) {
        if (dto.scopeType === 'CENTER' && !dto.scopeId) {
          throw new BadRequestException('scopeId is required for CENTER scope');
        }
        if (dto.scopeType === 'GLOBAL' && dto.scopeId) {
          throw new BadRequestException(
            'scopeId should not be provided for GLOBAL scope',
          );
        }
      }
    }

    // Create user with profile
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.fullName,
        password: hash,
        isActive: true,
        profile: {
          create: {
            type: ProfileType.BASE_USER,
            baseUser: {
              create: {},
            },
          },
        },
      },
      include: {
        profile: {
          include: {
            teacher: true,
            student: true,
            guardian: true,
            baseUser: true,
          },
        },
        centers: true,
        userPermissions: true,
      },
    });

    // Assign role if provided
    if (dto.roleId) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: dto.roleId,
          scopeType: dto.scopeType || 'GLOBAL',
          scopeId: dto.scopeType === 'CENTER' ? dto.scopeId : null,
        },
      });
    }

    // Grant access to the creator if provided
    if (createdBy) {
      await this.prisma.userAccess.create({
        data: {
          userId: createdBy,
          targetUserId: user.id,
        },
      });
    }

    this.logger.log(`Created user ${user.id} by ${createdBy || 'system'}`);
    const { password: __, ...restUser } = user;
    void __;
    return restUser;
  }

  async listUsers(
    query: PaginateQuery,
    currentUserId: string,
    scope: RoleScopeEnum = RoleScopeEnum.GLOBAL,
    centerId?: string,
  ): Promise<any> {
    // Build where clause based on scope
    const whereClause: any = {};

    if (scope === RoleScopeEnum.CENTER && centerId) {
      // If in center scope, only show users that are members of this center
      whereClause.centers = {
        some: {
          centerId,
        },
      };
    }
    // If in global scope, show all users (no UserAccess filter)

    // Handle filter parameters manually since nestjs-paginate doesn't parse them correctly
    if (query.filter && typeof query.filter === 'object') {
      if ('name' in query.filter && query.filter.name) {
        const nameValue = Array.isArray(query.filter.name)
          ? query.filter.name[0]
          : query.filter.name;
        if (nameValue) {
          whereClause.name = {
            contains: nameValue,
            mode: 'insensitive' as const,
          };
        }
      }

      if ('email' in query.filter && query.filter.email) {
        const emailValue = Array.isArray(query.filter.email)
          ? query.filter.email[0]
          : query.filter.email;
        if (emailValue) {
          whereClause.email = {
            contains: emailValue,
            mode: 'insensitive' as const,
          };
        }
      }
    }

    // Build orderBy
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    // Get pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Execute query manually
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        include: {
          centers: {
            include: {
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
          },
          profile: {
            include: {
              teacher: true,
              student: true,
              guardian: true,
              baseUser: true,
            },
          },
          userPermissions: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    const result = {
      data,
      total,
      page,
      limit,
    };

    // Transform the data to include all user information and profiles
    const transformedData = result.data.map((user: any) => {
      const { password, twoFactorSecret, userPermissions, ...userData } = user;

      // Transform centers to include essential data
      const transformedCenters = userData.centers.map((center: any) => ({
        id: center.center.id,
        name: center.center.name,
        role: {
          id: center.role.id,
          name: center.role.name,
        },
        isActive: center.isActive, // Include the isActive status from UserOnCenter
      }));

      // Determine user type based on profile type
      let userType = 'Base User';
      let profileData = null;

      if (userData.profile) {
        switch (userData.profile.type) {
          case ProfileType.TEACHER:
            userType = 'Teacher';
            profileData = userData.profile.teacher;
            break;
          case ProfileType.STUDENT:
            userType = 'Student';
            profileData = userData.profile.student;
            break;
          case ProfileType.GUARDIAN:
            userType = 'Guardian';
            profileData = userData.profile.guardian;
            break;
          case ProfileType.BASE_USER:
            userType = 'Base User';
            profileData = userData.profile.baseUser;
            break;
        }
      }

      return {
        ...userData,
        userType, // Add user type for easy identification
        profile: profileData,
        centers: transformedCenters,
      };
    });

    return {
      data: transformedData,
      meta: {
        itemsPerPage: result.limit,
        totalItems: result.total,
        currentPage: result.page,
        totalPages: Math.ceil(result.total / result.limit),
        sortBy: query.sortBy || [],
        searchBy: query.searchBy || [],
        search: query.search || '',
        filter: query.filter || {},
        select: [],
      },
      links: {
        first: `?page=1&limit=${result.limit}`,
        previous:
          result.page > 1
            ? `?page=${result.page - 1}&limit=${result.limit}`
            : '',
        current: `?page=${result.page}&limit=${result.limit}`,
        next:
          result.page < Math.ceil(result.total / result.limit)
            ? `?page=${result.page + 1}&limit=${result.limit}`
            : '',
        last: `?page=${Math.ceil(result.total / result.limit)}&limit=${result.limit}`,
      },
    };
  }

  async getAccessibleUsers(
    currentUserId: string,
    type?: 'Teacher' | 'Student' | 'Guardian',
  ): Promise<any[]> {
    // Get users that the current user has access to via UserAccess
    const userAccesses = await this.prisma.userAccess.findMany({
      where: { userId: currentUserId },
      select: { targetUserId: true },
    });

    const accessibleUserIds = userAccesses.map((access) => access.targetUserId);

    if (accessibleUserIds.length === 0) {
      return [];
    }

    // Build where clause
    const whereClause: any = {
      id: { in: accessibleUserIds },
    };

    // Add type filter if specified
    if (type) {
      whereClause.profile = {
        type: type.toUpperCase() as ProfileType,
      };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        profile: {
          include: {
            teacher: true,
            student: true,
            guardian: true,
            baseUser: true,
          },
        },
        centers: {
          include: {
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
        },
      },
    });

    return users.map((user) => {
      const { password, twoFactorSecret, ...userData } = user;

      // Determine user type and profile data
      let userType = 'Base User';
      let profileData = null;

      if (userData.profile) {
        switch (userData.profile.type) {
          case ProfileType.TEACHER:
            userType = 'Teacher';
            profileData = userData.profile.teacher;
            break;
          case ProfileType.STUDENT:
            userType = 'Student';
            profileData = userData.profile.student;
            break;
          case ProfileType.GUARDIAN:
            userType = 'Guardian';
            profileData = userData.profile.guardian;
            break;
          case ProfileType.BASE_USER:
            userType = 'Base User';
            profileData = userData.profile.baseUser;
            break;
        }
      }

      return {
        ...userData,
        userType,
        profile: profileData,
      };
    });
  }

  async getUserPermissions(
    userId: string,
    scopeType: RoleScopeEnum = RoleScopeEnum.GLOBAL,
    scopeId?: string,
  ) {
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
            scopeId: scopeType === RoleScopeEnum.CENTER ? scopeId : null,
          },
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Aggregate permissions
    const direct = user.userPermissions.map((up) => up.permission.action);
    const rolePerms = user.userRoles.flatMap((ur) => {
      const rolePerms = ur.role.permissions as any;
      return rolePerms ? rolePerms.map((p: any) => p.action) : [];
    });
    const permissions = [...new Set([...direct, ...rolePerms])];

    return {
      permissions,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        scope: ur.scopeType,
        centerId: ur.scopeId,
      })),
    };
  }

  async deleteUser(userId: string, currentUserId: string): Promise<void> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        centers: true,
        centersOwned: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Check if user owns any centers
    if (user.centersOwned.length > 0) {
      throw new BadRequestException(
        'Cannot delete user who owns centers. Transfer ownership first.',
      );
    }

    // Check if user is the only admin in any centers
    const userCenters = user.centers.map((center) => center.centerId);
    if (userCenters.length > 0) {
      for (const centerId of userCenters) {
        const centerAdmins = await this.prisma.userRole.findMany({
          where: {
            scopeId: centerId,
            scopeType: 'CENTER',
            role: {
              isAdmin: true,
            },
          },
        });

        if (centerAdmins.length === 1 && centerAdmins[0].userId === userId) {
          throw new BadRequestException(
            `Cannot delete user who is the only admin in center ${centerId}. Assign another admin first.`,
          );
        }
      }
    }

    // Delete user (this will cascade to profile and related data)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    this.logger.log(`Deleted user ${userId} by ${currentUserId}`);
  }

  async activateUser(
    userId: string,
    dto: { isActive: boolean; scopeType: RoleScope; centerId?: string },
    currentUserId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.scopeType === RoleScope.CENTER) {
      if (!dto.centerId) {
        throw new BadRequestException('centerId is required for CENTER scope');
      }

      // Update center-specific activation status
      const updated = await this.prisma.userOnCenter.updateMany({
        where: {
          userId,
          centerId: dto.centerId,
        },
        data: {
          isActive: dto.isActive,
        },
      });

      if (updated.count === 0) {
        throw new NotFoundException(
          'User is not a member of the specified center',
        );
      }

      this.logger.log(
        `Updated center activation status for user ${userId} in center ${dto.centerId} to ${dto.isActive} by ${currentUserId}`,
      );
    } else {
      // Update global activation status
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: dto.isActive },
      });

      this.logger.log(
        `Updated global activation status for user ${userId} to ${dto.isActive} by ${currentUserId}`,
      );
    }
  }

  async getUserActivationStatus(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        centers: {
          include: {
            center: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      global: {
        isActive: user.isActive,
      },
      centers: user.centers.map((center) => ({
        centerId: center.centerId,
        centerName: center.center.name,
        isActive: center.isActive,
      })),
    };
  }
}
