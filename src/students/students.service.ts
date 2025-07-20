import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AddStudentToCenterDto } from './dto/add-student-to-center.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createStudent(dto: CreateStudentDto) {
    const {
      email,
      name,
      password,
      grade,
      level,
      guardianId,
      teacherId,
      centerId,
      ...studentData
    } = dto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          password, // Should be hashed in the controller
          isActive: true,
        },
      });
      userId = user.id;
    }

    // Create or update student record
    const student = await this.prisma.student.upsert({
      where: { userId },
      update: {
        grade,
        level,
        guardianId,
        teacherId,
        ...studentData,
      },
      create: {
        userId,
        grade,
        level,
        guardianId,
        teacherId,
        ...studentData,
      },
    });

    // If centerId is provided, add user to center with Student role
    if (centerId) {
      await this.addStudentToCenter(userId, centerId);
    }

    return this.getStudentWithDetails(student.id);
  }

  async addStudentToCenter(
    userId: string,
    centerId: string,
    dto?: AddStudentToCenterDto,
  ) {
    // Find Student role for this center
    const studentRole = await this.prisma.role.findFirst({
      where: {
        name: { startsWith: 'Student' },
        scope: 'CENTER',
        centerId,
      },
    });

    if (!studentRole) {
      throw new BadRequestException('Student role not found for this center');
    }

    // Check if user is already in this center
    const existingUserOnCenter = await this.prisma.userOnCenter.findFirst({
      where: {
        userId,
        centerId,
      },
    });

    if (existingUserOnCenter) {
      throw new BadRequestException('Student is already in this center');
    }

    // Add user to center with Student role
    await this.prisma.userOnCenter.create({
      data: {
        userId,
        centerId,
        roleId: studentRole.id,
        createdBy: dto?.createdBy || 'system',
        metadata: dto?.metadata || {},
      },
    });

    return { message: 'Student added to center successfully' };
  }

  async getStudentWithDetails(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          include: {
            centers: {
              include: {
                center: true,
                role: true,
              },
            },
          },
        },
        teacher: {
          include: {
            user: true,
          },
        },
        guardian: true,
        groups: true,
        attendance: {
          include: {
            session: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getAllStudents() {
    const students = await this.prisma.student.findMany({
      include: {
        user: {
          include: {
            centers: {
              include: {
                center: true,
                role: true,
              },
            },
          },
        },
        teacher: {
          include: {
            user: true,
          },
        },
        guardian: true,
        groups: true,
        attendance: {
          include: {
            session: true,
          },
        },
      },
    });

    return students;
  }

  async getStudentsByCenter(centerId: string) {
    const userOnCenters = await this.prisma.userOnCenter.findMany({
      where: {
        centerId,
        role: {
          name: { startsWith: 'Student' },
        },
      },
      include: {
        user: {
          include: {
            teacherProfile: true,
          },
        },
        role: true,
      },
    });

    // Get student details for each user
    const students = await Promise.all(
      userOnCenters.map(async (userOnCenter) => {
        const student = await this.prisma.student.findUnique({
          where: { userId: userOnCenter.user.id },
          include: {
            guardian: true,
            groups: {
              where: { centerId },
            },
            attendance: {
              include: {
                session: true,
              },
            },
          },
        });

        return {
          ...userOnCenter,
          student,
        };
      }),
    );

    return students.filter((item) => item.student); // Only return users who are students
  }

  async getStudentCenters(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          include: {
            centers: {
              include: {
                center: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student.user.centers;
  }

  async updateStudent(studentId: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data: dto,
      include: {
        user: true,
        teacher: {
          include: {
            user: true,
          },
        },
        guardian: true,
        groups: true,
      },
    });
  }

  async removeStudentFromCenter(userId: string, centerId: string) {
    const userOnCenter = await this.prisma.userOnCenter.findFirst({
      where: {
        userId,
        centerId,
        role: {
          name: { startsWith: 'Student' },
        },
      },
    });

    if (!userOnCenter) {
      throw new NotFoundException('Student not found in this center');
    }

    await this.prisma.userOnCenter.delete({
      where: { id: userOnCenter.id },
    });

    return { message: 'Student removed from center successfully' };
  }

  async deleteStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          include: {
            centers: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Remove student from all centers
    await this.prisma.userOnCenter.deleteMany({
      where: {
        userId: student.userId,
        role: {
          name: { startsWith: 'Student' },
        },
      },
    });

    // Delete student record
    await this.prisma.student.delete({
      where: { id: studentId },
    });

    // Check if user has other roles (teacher, admin, etc.)
    const remainingRoles = await this.prisma.userOnCenter.findMany({
      where: { userId: student.userId },
    });

    // If no other roles, delete the user
    if (remainingRoles.length === 0) {
      await this.prisma.user.delete({
        where: { id: student.userId },
      });
    }

    return { message: 'Student deleted successfully' };
  }

  async getStudentStats(studentId: string, centerId?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get attendance data separately
    const attendanceQuery = centerId
      ? {
          studentId,
          session: {
            centerId,
          },
        }
      : { studentId };

    const attendance = await this.prisma.attendance.findMany({
      where: attendanceQuery,
      include: {
        session: true,
      },
    });

    // Get groups data separately
    const groupsQuery = centerId
      ? {
          studentMembers: {
            some: {
              id: studentId,
            },
          },
          centerId,
        }
      : {
          studentMembers: {
            some: {
              id: studentId,
            },
          },
        };

    const groups = await this.prisma.group.findMany({
      where: groupsQuery,
    });

    const totalSessions = attendance.length;
    const presentSessions = attendance.filter(
      (a) => a.status === 'PRESENT',
    ).length;
    const attendanceRate =
      totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

    return {
      totalSessionsAttended: student.totalSessionsAttended,
      totalPayments: student.totalPayments,
      performanceScore: student.performanceScore,
      attendanceRate,
      totalGroups: groups.length,
      totalSessions: totalSessions,
      presentSessions,
    };
  }
}
