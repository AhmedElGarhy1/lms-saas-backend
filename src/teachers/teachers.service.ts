import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PaginateQuery } from 'nestjs-paginate';
import { TeacherResponseDto } from './dto/teacher.dto';
import { UpdateTeacherRequestDto } from './dto/teacher.dto';
import { CurrentUser } from '../shared/types/current-user.type';
import { RoleScopeEnum } from '../access-control/constants/role-scope.enum';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: any,
  ) {}

  async createTeacher(
    createTeacherDto: any, // This type will need to be updated based on the actual DTO
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      // Check if teacher profile already exists for this user
      const existingTeacherProfile = await this.prisma.profile.findFirst({
        where: {
          userId: createTeacherDto.userId,
          type: 'TEACHER',
        },
      });

      if (existingTeacherProfile) {
        throw new ConflictException(
          'Teacher profile already exists for this user',
        );
      }

      // Verify the user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createTeacherDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Create teacher record first
        const teacherRecord = await tx.teacher.create({
          data: {
            biography: createTeacherDto.biography,
            experienceYears: createTeacherDto.experienceYears,
            specialization: createTeacherDto.specialization,
          },
        });

        // Create profile record linking to teacher
        const profileRecord = await tx.profile.create({
          data: {
            userId: createTeacherDto.userId,
            type: 'TEACHER',
            teacherId: teacherRecord.id,
          },
        });

        // Return the user with teacher profile
        return tx.user.findUnique({
          where: { id: createTeacherDto.userId },
          include: {
            profile: {
              include: {
                teacher: true,
              },
            },
            centers: {
              include: {
                center: true,
                role: true,
              },
            },
          },
        });
      });

      if (!result) {
        throw new Error('Failed to create teacher profile');
      }

      this.logger.info('Teacher profile created', {
        teacherId: result.profile?.teacher?.id,
        userId: createTeacherDto.userId,
        createdBy: currentUser.id,
        action: 'CREATE_TEACHER',
      });

      return this.mapToResponseDto(result);
    } catch (error) {
      this.logger.error('Failed to create teacher profile', {
        error: error.message,
        userId: createTeacherDto.userId,
        createdBy: currentUser.id,
        action: 'CREATE_TEACHER',
      });
      throw error;
    }
  }

  async getTeacherById(
    id: string,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.profile?.teacher) {
        throw new NotFoundException('Teacher profile not found');
      }

      // Check if current user can access this teacher profile
      if (
        user.id !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to get teacher by ID', {
        error: error.message,
        teacherId: id,
        requestedBy: currentUser.id,
        action: 'GET_TEACHER_BY_ID',
      });
      throw error;
    }
  }

  async getTeacherByUserId(
    userId: string,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          profile: {
            type: 'TEACHER',
          },
        },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Teacher not found');
      }

      // Check if current user can access this teacher profile
      if (
        user.id !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to get teacher by user ID', {
        error: error.message,
        userId,
        requestedBy: currentUser.id,
        action: 'GET_TEACHER_BY_USER_ID',
      });
      throw error;
    }
  }

  async updateTeacher(
    id: string,
    updateTeacherDto: UpdateTeacherRequestDto,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.profile?.teacher) {
        throw new NotFoundException('Teacher profile not found');
      }

      // Check if current user can update this teacher profile
      if (
        user.id !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      // Update teacher profile
      const updatedTeacher = await this.prisma.teacher.update({
        where: { id: user.profile.teacher.id },
        data: {
          biography: updateTeacherDto.biography,
          experienceYears: updateTeacherDto.experienceYears,
          specialization: updateTeacherDto.specialization,
        },
      });

      // Get updated user with teacher profile
      const updatedUser = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
        },
      });

      this.logger.info('Teacher profile updated', {
        teacherId: updatedTeacher.id,
        userId: id,
        updatedBy: currentUser.id,
        action: 'UPDATE_TEACHER',
      });

      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error('Failed to update teacher profile', {
        error: error.message,
        teacherId: id,
        updatedBy: currentUser.id,
        action: 'UPDATE_TEACHER',
      });
      throw error;
    }
  }

  async getAllTeachers(
    query: PaginateQuery,
    currentUser: CurrentUser,
  ): Promise<any> {
    try {
      // Get all users with teacher profiles
      const users = await this.prisma.user.findMany({
        where: {
          profile: {
            type: 'TEACHER',
          },
        },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
        },
        skip: ((query.page || 1) - 1) * (query.limit || 10),
        take: query.limit || 10,
      });

      const total = await this.prisma.user.count({
        where: {
          profile: {
            type: 'TEACHER',
          },
        },
      });

      const teachers = users.map((user) => this.mapToResponseDto(user));

      return {
        teachers,
        total,
        page: query.page || 1,
        limit: query.limit || 10,
      };
    } catch (error) {
      this.logger.error('Failed to get all teachers', {
        error: error.message,
        requestedBy: currentUser.id,
        action: 'GET_ALL_TEACHERS',
      });
      throw error;
    }
  }

  async incrementProfileViews(
    id: string,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.profile?.teacher) {
        throw new NotFoundException('Teacher profile not found');
      }

      // Increment profile views
      const updatedTeacher = await this.prisma.teacher.update({
        where: { id: user.profile.teacher.id },
        data: {
          profileViews: {
            increment: 1,
          },
        },
      });

      // Get updated user with teacher profile
      const updatedUser = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
        },
      });

      this.logger.info('Teacher profile views incremented', {
        teacherId: updatedTeacher.id,
        userId: id,
        incrementedBy: currentUser.id,
        action: 'INCREMENT_PROFILE_VIEWS',
      });

      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error('Failed to increment teacher profile views', {
        error: error.message,
        teacherId: id,
        incrementedBy: currentUser.id,
        action: 'INCREMENT_PROFILE_VIEWS',
      });
      throw error;
    }
  }

  async deleteTeacher(id: string, currentUser: CurrentUser): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.profile?.teacher) {
        throw new NotFoundException('Teacher profile not found');
      }

      // Check if current user can delete this teacher profile
      if (
        user.id !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      // Delete the teacher (this will cascade to the profile)
      await this.prisma.teacher.delete({
        where: { id: user.profile.teacher.id },
      });

      this.logger.info('Teacher profile deleted', {
        teacherId: user.profile.teacher.id,
        userId: id,
        deletedBy: currentUser.id,
        action: 'DELETE_TEACHER',
      });
    } catch (error) {
      this.logger.error('Failed to delete teacher profile', {
        error: error.message,
        teacherId: id,
        deletedBy: currentUser.id,
        action: 'DELETE_TEACHER',
      });
      throw error;
    }
  }

  private mapToResponseDto(user: any): TeacherResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile
        ? {
            id: user.profile.id,
            type: user.profile.type,
            teacher: user.profile.teacher
              ? {
                  id: user.profile.teacher.id,
                  biography: user.profile.teacher.biography,
                  experienceYears: user.profile.teacher.experienceYears,
                  specialization: user.profile.teacher.specialization,
                  profileViews: user.profile.teacher.profileViews,
                  rating: user.profile.teacher.rating,
                  studentsCount: user.profile.teacher.studentsCount,
                  centersCount: user.profile.teacher.centersCount,
                  createdAt: user.profile.teacher.createdAt,
                  updatedAt: user.profile.teacher.updatedAt,
                }
              : undefined,
          }
        : undefined,
      // centers: user.centers?.map((centerAccess: any) => ({
      //   center: {
      //     id: centerAccess.center.id,
      //     name: centerAccess.center.name,
      //     description: centerAccess.center.description,
      //     location: centerAccess.center.location,
      //   },
      //   role: {
      //     id: centerAccess.role.id,
      //     name: centerAccess.role.name,
      //   },
      // })),
    };
  }

  private async isAdminOrCenterOwner(user: CurrentUser): Promise<boolean> {
    // Check if user has global admin role
    const globalAdminRole = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        scopeType: RoleScopeEnum.GLOBAL,
        role: {
          isAdmin: true,
        },
      },
    });

    if (globalAdminRole) {
      return true;
    }

    // Check if user owns any centers
    const ownedCenters = await this.prisma.center.findFirst({
      where: {
        ownerId: user.id,
      },
    });

    return !!ownedCenters;
  }
}
