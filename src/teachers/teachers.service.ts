import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  TeacherResponseDto,
} from './dto/teacher.dto';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CurrentUser } from '../shared/types/current-user.type';
import { PaginateQuery } from 'nestjs-paginate';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createTeacher(
    createTeacherDto: CreateTeacherDto,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      // Check if teacher profile already exists for this user
      const existingTeacher = await this.prisma.teacher.findUnique({
        where: { userId: createTeacherDto.userId },
      });

      if (existingTeacher) {
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

      const teacher = await this.prisma.teacher.create({
        data: {
          userId: createTeacherDto.userId,
          biography: createTeacherDto.biography,
          experienceYears: createTeacherDto.experienceYears,
          specialization: createTeacherDto.specialization,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.info('Teacher profile created', {
        teacherId: teacher.id,
        userId: teacher.userId,
        createdBy: currentUser.id,
        action: 'CREATE_TEACHER',
      });

      return this.mapToResponseDto(teacher);
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
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // Check if current user can access this teacher profile
      if (
        teacher.userId !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      return this.mapToResponseDto(teacher);
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
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // Check if current user can access this teacher profile
      if (
        teacher.userId !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      return this.mapToResponseDto(teacher);
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
    updateTeacherDto: UpdateTeacherDto,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // Check if current user can update this teacher profile
      if (
        teacher.userId !== currentUser.id &&
        !(await this.isAdminOrCenterOwner(currentUser))
      ) {
        throw new ForbiddenException('Access denied');
      }

      const updatedTeacher = await this.prisma.teacher.update({
        where: { id },
        data: {
          biography: updateTeacherDto.biography,
          experienceYears: updateTeacherDto.experienceYears,
          specialization: updateTeacherDto.specialization,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.info('Teacher profile updated', {
        teacherId: id,
        userId: teacher.userId,
        updatedBy: currentUser.id,
        changes: updateTeacherDto,
        action: 'UPDATE_TEACHER',
      });

      return this.mapToResponseDto(updatedTeacher);
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
    if (!(await this.isAdminOrCenterOwner(currentUser))) {
      throw new ForbiddenException('Access denied');
    }
    const where: any = {};
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'name' in query.filter
    ) {
      where.user = {
        name: { contains: query.filter.name as string, mode: 'insensitive' },
      };
    }
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: {
          user: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      data: teachers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async incrementProfileViews(
    id: string,
    currentUser: CurrentUser,
  ): Promise<TeacherResponseDto> {
    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      const updatedTeacher = await this.prisma.teacher.update({
        where: { id },
        data: {
          profileViews: {
            increment: 1,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.info('Teacher profile views incremented', {
        teacherId: id,
        userId: teacher.userId,
        viewedBy: currentUser.id,
        newViewCount: updatedTeacher.profileViews,
        action: 'INCREMENT_PROFILE_VIEWS',
      });

      return this.mapToResponseDto(updatedTeacher);
    } catch (error) {
      this.logger.error('Failed to increment profile views', {
        error: error.message,
        teacherId: id,
        viewedBy: currentUser.id,
        action: 'INCREMENT_PROFILE_VIEWS',
      });
      throw error;
    }
  }

  async deleteTeacher(id: string, currentUser: CurrentUser): Promise<void> {
    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // Only admins and center owners can delete teacher profiles
      if (!(await this.isAdminOrCenterOwner(currentUser))) {
        throw new ForbiddenException('Access denied');
      }

      await this.prisma.teacher.delete({
        where: { id },
      });

      this.logger.info('Teacher profile deleted', {
        teacherId: id,
        userId: teacher.userId,
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

  private mapToResponseDto(teacher: any): TeacherResponseDto {
    return {
      id: teacher.id,
      userId: teacher.userId,
      biography: teacher.biography,
      experienceYears: teacher.experienceYears,
      specialization: teacher.specialization,
      profileViews: teacher.profileViews,
      rating: teacher.rating,
      studentsCount: teacher.studentsCount,
      centersCount: teacher.centersCount,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
      user: teacher.user,
    };
  }

  private async isAdminOrCenterOwner(user: CurrentUser): Promise<boolean> {
    // Check if user has global admin role
    const globalAdminRole = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        scopeType: 'GLOBAL',
        role: {
          name: 'admin',
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
