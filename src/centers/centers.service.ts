import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateCenterRequestDto } from './dto/create-center.dto';
import { UpdateCenterRequestDto } from './dto/update-center.dto';
import { AddMemberRequestDto } from './dto/add-member.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginateQuery } from 'nestjs-paginate';
import {
  OWNER_PERMISSIONS,
  TEACHER_PERMISSIONS,
  STUDENT_PERMISSIONS,
} from '../access-control/constants/permissions';
import { ProfileType } from '@prisma/client';

@Injectable()
export class CentersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Center management
  async createCenter(dto: CreateCenterRequestDto & { ownerId: string }) {
    // Create center and basic roles in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create the center
      const center = await tx.center.create({
        data: {
          name: dto.name,
          description: dto.description,
          ownerId: dto.ownerId,
        },
      });

      // 2. Create basic roles for the center
      const ownerRole = await tx.role.create({
        data: {
          name: 'Owner',
          scope: 'CENTER',
          centerId: center.id,
          metadata: {
            description: 'Center Owner - Full control over the center',
            isDefault: true,
          },
        },
      });

      const teacherRole = await tx.role.create({
        data: {
          name: 'Teacher',
          scope: 'CENTER',
          centerId: center.id,
          metadata: {
            description:
              'Teacher - Can manage classes, attendance, and students',
            isDefault: true,
          },
        },
      });

      const studentRole = await tx.role.create({
        data: {
          name: 'Student',
          scope: 'CENTER',
          centerId: center.id,
          metadata: {
            description: 'Student - Can view schedules and attendance',
            isDefault: true,
          },
        },
      });

      // 3. Get all permissions from the database
      const allPermissions = await tx.permission.findMany();

      // 4. Define explicit permission arrays for each role
      const ownerRolePermissions = allPermissions.filter((p) =>
        OWNER_PERMISSIONS.includes(p.action),
      );

      const teacherRolePermissions = allPermissions.filter((p) =>
        TEACHER_PERMISSIONS.includes(p.action),
      );

      const studentRolePermissions = allPermissions.filter((p) =>
        STUDENT_PERMISSIONS.includes(p.action),
      );

      // 5. Update roles with JSON permissions
      await tx.role.update({
        where: { id: ownerRole.id },
        data: {
          permissions: ownerRolePermissions.map((perm) => perm.action),
        },
      });

      await tx.role.update({
        where: { id: teacherRole.id },
        data: {
          permissions: teacherRolePermissions.map((perm) => perm.action),
        },
      });

      await tx.role.update({
        where: { id: studentRole.id },
        data: {
          permissions: studentRolePermissions.map((perm) => perm.action),
        },
      });

      // 6. Determine which role to assign to the owner
      let assignedRoleId = ownerRole.id; // Default to Owner role

      if (dto.roleId) {
        // Validate the provided roleId
        const providedRole = await tx.role.findFirst({
          where: {
            id: dto.roleId,
            scope: 'CENTER',
            centerId: center.id,
          },
        });

        if (providedRole) {
          assignedRoleId = providedRole.id;
        } else {
          // If provided roleId is not valid, use default Owner role
          this.logger.warn(
            `Invalid roleId provided: ${dto.roleId}, using default Owner role`,
          );
        }
      }

      // 7. Assign the owner to the center with the selected role
      await tx.userOnCenter.create({
        data: {
          userId: dto.ownerId,
          centerId: center.id,
          roleId: assignedRoleId,
          createdBy: dto.ownerId,
        },
      });

      // 8. Create additional records based on the assigned role
      const assignedRole = await tx.role.findUnique({
        where: { id: assignedRoleId },
      });

      if (assignedRole?.name === 'Teacher') {
        // Check if user already has a teacher profile
        const existingTeacherProfile = await tx.profile.findFirst({
          where: {
            userId: dto.ownerId,
            type: 'TEACHER',
          },
        });

        if (!existingTeacherProfile) {
          // Create teacher record first
          const teacherRecord = await tx.teacher.create({
            data: {
              profileViews: 0,
              rating: 0,
              studentsCount: 0,
              centersCount: 0,
            },
          });

          // Create profile record linking to teacher
          await tx.profile.create({
            data: {
              userId: dto.ownerId,
              type: 'TEACHER',
              teacherId: teacherRecord.id,
            },
          });
        }
      } else if (assignedRole?.name === 'Student') {
        // Check if user already has a student profile
        const existingStudentProfile = await tx.profile.findFirst({
          where: {
            userId: dto.ownerId,
            type: 'STUDENT',
          },
        });

        if (!existingStudentProfile) {
          // Create student record first
          const studentRecord = await tx.student.create({
            data: {
              grade: 'OTHER',
            },
          });

          // Create profile record linking to student
          await tx.profile.create({
            data: {
              userId: dto.ownerId,
              type: 'STUDENT',
              studentId: studentRecord.id,
            },
          });
        }
      }

      return {
        center,
        roles: {
          owner: ownerRole,
          teacher: teacherRole,
          student: studentRole,
        },
        assignedRole: assignedRole,
      };
    });

    this.logger.log(
      `Created center ${result.center.id} with role ${result.assignedRole?.name || 'Owner'} by user ${dto.ownerId}`,
    );

    return result.center;
  }

  async updateCenter(centerId: string, dto: UpdateCenterRequestDto) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    const updated = await this.prisma.center.update({
      where: { id: centerId },
      data: { ...dto },
    });
    this.logger.log(`Updated center ${centerId}`);
    return updated;
  }

  async softDeleteCenter(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    const deleted = await this.prisma.center.update({
      where: { id: centerId },
      data: { deletedAt: new Date() },
    });
    this.logger.warn(`Soft deleted center ${centerId}`);
    return deleted;
  }

  async getCenterById(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    this.logger.log(`Fetched center ${centerId}`);
    return center;
  }

  async listCentersForUser(userId: string, query: PaginateQuery): Promise<any> {
    // Find all centers the user is a member of via UserOnCenter
    const userOnCenters = await this.prisma.userOnCenter.findMany({
      where: { userId },
      select: { centerId: true },
    });
    const centerIds = userOnCenters.map((a) => a.centerId);

    // Build where clause
    const where: any = { id: { in: centerIds }, deletedAt: null };
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

    // Build orderBy clause
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { name: 'asc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [centers, total] = await Promise.all([
      this.prisma.center.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.center.count({ where }),
    ]);

    return {
      data: centers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Member management
  async addMember(
    centerId: string,
    dto: AddMemberRequestDto & { createdBy: string },
  ) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');

    const exists = await this.prisma.userOnCenter.findFirst({
      where: { centerId, userId: dto.userId },
    });
    if (exists) throw new BadRequestException('User already a member');

    // Find role by roleId or name
    let role;
    if (dto.roleId) {
      role = await this.prisma.role.findFirst({
        where: {
          id: dto.roleId,
          scope: 'CENTER',
          centerId,
        },
      });
    } else if (dto.role) {
      role = await this.prisma.role.findFirst({
        where: {
          name: dto.role,
          scope: 'CENTER',
          centerId,
        },
      });
    } else {
      throw new BadRequestException('Either roleId or role must be provided');
    }

    if (!role) throw new NotFoundException('Role not found for this center');

    // Add member and handle additional records in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Add user to center with the specified role
      const member = await tx.userOnCenter.create({
        data: {
          centerId,
          userId: dto.userId,
          roleId: role.id,
          createdBy: dto.createdBy,
        },
      });

      // Handle additional records based on the role
      if (role.name === 'Teacher') {
        // Check if teacher record already exists
        const existingTeacher = await tx.teacher.findFirst({
          where: {
            profile: {
              userId: dto.userId,
            },
          },
        });

        if (!existingTeacher) {
          // Create teacher record with profile
          await tx.teacher.create({
            data: {
              profileViews: 0,
              rating: 0,
              studentsCount: 0,
              centersCount: 0,
              profile: {
                create: {
                  userId: dto.userId,
                  type: ProfileType.TEACHER,
                },
              },
            },
          });
        }
      } else if (role.name === 'Student') {
        // Check if student record exists
        let studentRecord = await tx.student.findFirst({
          where: {
            profile: {
              userId: dto.userId,
            },
          },
        });

        if (!studentRecord) {
          // Create student record with profile
          studentRecord = await tx.student.create({
            data: {
              grade: 'OTHER',
              profile: {
                create: {
                  userId: dto.userId,
                  type: ProfileType.STUDENT,
                },
              },
            },
          });
        }
      }

      return member;
    });

    this.logger.log(
      `Added user ${dto.userId} to center ${centerId} as ${role.name} by ${dto.createdBy}`,
    );
    return result;
  }

  // Helper methods to get default roles
  async getDefaultRoles(centerId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        scope: 'CENTER',
        centerId,
        name: {
          in: ['Owner', 'Teacher', 'Student'],
        },
      },
    });

    return {
      owner: roles.find((r) => (r as any).name === 'Owner'),
      teacher: roles.find((r) => (r as any).name === 'Teacher'),
      student: roles.find((r) => (r as any).name === 'Student'),
    };
  }

  async getOwnerRole(centerId: string) {
    return this.prisma.role.findFirst({
      where: {
        name: 'Owner',
        scope: 'CENTER',
        centerId,
      },
    });
  }

  async getTeacherRole(centerId: string) {
    return this.prisma.role.findFirst({
      where: {
        name: 'Teacher',
        scope: 'CENTER',
        centerId,
      },
    });
  }

  async getStudentRole(centerId: string) {
    return this.prisma.role.findFirst({
      where: {
        name: 'Student',
        scope: 'CENTER',
        centerId,
      },
    });
  }

  // Method to assign a user as a teacher (creates teacher record)
  async assignAsTeacher(centerId: string, userId: string, createdBy: string) {
    const teacherRole = await this.getTeacherRole(centerId);
    if (!teacherRole) {
      throw new NotFoundException('Teacher role not found for this center');
    }

    // Check if user already has a teacher profile
    const existingTeacherProfile = await this.prisma.profile.findFirst({
      where: {
        userId,
        type: 'TEACHER',
      },
      include: {
        teacher: true,
      },
    });

    if (existingTeacherProfile) {
      throw new BadRequestException('User already has a teacher profile');
    }

    // Create teacher profile and assign role
    const result = await this.prisma.$transaction(async (tx) => {
      // Add user to center with teacher role
      const userOnCenter = await tx.userOnCenter.create({
        data: {
          userId,
          centerId,
          roleId: teacherRole.id,
          createdBy,
        },
      });

      // Create teacher record first
      const teacherRecord = await tx.teacher.create({
        data: {
          profileViews: 0,
          rating: 0,
          studentsCount: 0,
          centersCount: 0,
        },
      });

      // Create profile record linking to teacher
      const profileRecord = await tx.profile.create({
        data: {
          userId,
          type: 'TEACHER',
          teacherId: teacherRecord.id,
        },
      });

      return { userOnCenter, teacherRecord, profileRecord };
    });

    this.logger.log(
      `Assigned user ${userId} as teacher in center ${centerId} by ${createdBy}`,
    );

    return result;
  }

  // Method to assign a user as a student (creates student record)
  async assignAsStudent(centerId: string, userId: string, createdBy: string) {
    const studentRole = await this.getStudentRole(centerId);
    if (!studentRole) {
      throw new NotFoundException('Student role not found for this center');
    }

    // Check if user already has a student profile
    const existingStudentProfile = await this.prisma.profile.findFirst({
      where: {
        userId,
        type: 'STUDENT',
      },
      include: {
        student: true,
      },
    });

    if (existingStudentProfile) {
      // Check if user is already assigned to this center
      const existingCenterAssignment = await this.prisma.userOnCenter.findFirst(
        {
          where: {
            userId,
            centerId,
          },
        },
      );

      if (existingCenterAssignment) {
        throw new BadRequestException(
          'User is already a student in this center',
        );
      }
    }

    // Create student profile and assign role
    const result = await this.prisma.$transaction(async (tx) => {
      // Add user to center with student role
      const userOnCenter = await tx.userOnCenter.create({
        data: {
          userId,
          centerId,
          roleId: studentRole.id,
          createdBy,
        },
      });

      // Create or update student record
      let studentRecord = await tx.student.findFirst({
        where: {
          profile: {
            userId,
          },
        },
      });

      if (!studentRecord) {
        // Create student record first
        studentRecord = await tx.student.create({
          data: {
            grade: 'OTHER',
          },
        });

        // Create profile record linking to student
        await tx.profile.create({
          data: {
            userId,
            type: 'STUDENT',
            studentId: studentRecord.id,
          },
        });
      }

      return { userOnCenter, studentRecord };
    });

    this.logger.log(
      `Assigned user ${userId} as student in center ${centerId} by ${createdBy}`,
    );

    return result;
  }

  async removeMember(centerId: string, userId: string) {
    const member = await this.prisma.userOnCenter.findFirst({
      where: { centerId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.userOnCenter.delete({ where: { id: member.id } });
    this.logger.warn(`Removed user ${userId} from center ${centerId}`);
    return { success: true };
  }

  async changeMemberRole(centerId: string, userId: string, newRole: string) {
    const member = await this.prisma.userOnCenter.findFirst({
      where: { centerId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const role = await this.prisma.role.findFirst({
      where: { name: newRole, scope: 'CENTER', centerId },
    });
    if (!role) throw new NotFoundException('Role not found for this center');

    // Update role assignment and handle additional records in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the role assignment
      const updated = await tx.userOnCenter.update({
        where: { id: member.id },
        data: { roleId: role.id },
      });

      // Handle additional records based on the new role
      if (newRole === 'Teacher') {
        // Check if teacher profile already exists
        const existingTeacherProfile = await tx.profile.findFirst({
          where: {
            userId,
            type: 'TEACHER',
          },
        });

        if (!existingTeacherProfile) {
          // Create teacher record first
          const teacherRecord = await tx.teacher.create({
            data: {
              profileViews: 0,
              rating: 0,
              studentsCount: 0,
              centersCount: 0,
            },
          });

          // Create profile record linking to teacher
          await tx.profile.create({
            data: {
              userId,
              type: 'TEACHER',
              teacherId: teacherRecord.id,
            },
          });
        }
      } else if (newRole === 'Student') {
        // Check if student profile exists
        const existingStudentProfile = await tx.profile.findFirst({
          where: {
            userId,
            type: 'STUDENT',
          },
        });

        if (!existingStudentProfile) {
          // Create student record first
          const studentRecord = await tx.student.create({
            data: {
              grade: 'OTHER',
            },
          });

          // Create profile record linking to student
          await tx.profile.create({
            data: {
              userId,
              type: 'STUDENT',
              studentId: studentRecord.id,
            },
          });
        }
      } else if (newRole === 'Owner') {
        // Remove teacher/student profiles if they exist (Owner is not a teacher or student)
        await tx.profile.deleteMany({
          where: {
            userId,
            type: {
              in: ['TEACHER', 'STUDENT'],
            },
          },
        });
      }

      return updated;
    });

    this.logger.log(
      `Changed role for user ${userId} in center ${centerId} to ${newRole}`,
    );
    return result;
  }

  async listMembers(centerId: string) {
    const members = await this.prisma.userOnCenter.findMany({
      where: { centerId },
      include: { user: true, role: true },
    });
    this.logger.log(`Listed members for center ${centerId}`);
    return members;
  }

  async filterMembersByRole(centerId: string, role: string) {
    const roleObj = await this.prisma.role.findFirst({
      where: { name: role, scope: 'CENTER', centerId },
    });
    if (!roleObj) throw new NotFoundException('Role not found for this center');
    const members = await this.prisma.userOnCenter.findMany({
      where: { centerId, roleId: roleObj.id },
      include: { user: true, role: true },
    });
    this.logger.log(`Filtered members by role ${role} in center ${centerId}`);
    return members;
  }

  /**
   * Returns members of a center that the current user has access to (via UserAccess).
   */
  async listAccessibleMembers(centerId: string, currentUserId: string) {
    // Get all userIds this user can access
    const accesses = await this.prisma.userAccess.findMany({
      where: { userId: currentUserId },
      select: { targetUserId: true },
    });
    const accessibleUserIds = accesses.map((a) => a.targetUserId);
    // Return only members in this center that are accessible
    return this.prisma.userOnCenter.findMany({
      where: {
        centerId,
        userId: { in: accessibleUserIds },
      },
      include: {
        user: true,
        role: true,
      },
    });
  }

  /**
   * Validate if a user has active access to a center
   * @param userId - The user ID to validate
   * @param centerId - The center ID to check access for
   * @returns true if user has active access, throws ForbiddenException otherwise
   */
  async validateCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<boolean> {
    const userOnCenter = await this.prisma.userOnCenter.findFirst({
      where: {
        userId,
        centerId,
      },
    });

    if (!userOnCenter) {
      throw new ForbiddenException('User is not a member of this center');
    }

    if (!userOnCenter.isActive) {
      throw new ForbiddenException('User is deactivated in this center');
    }

    return true;
  }
}
