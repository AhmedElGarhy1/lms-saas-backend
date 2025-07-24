import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AddStudentToCenterRequestDto } from './dto/add-student-to-center.dto';
import { StudentGrade } from '@prisma/client';
import { CreateStudentRequestDto } from './dto/create-student.dto';
import { UpdateStudentRequestDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createStudent(dto: CreateStudentRequestDto, userId: string) {
    // Implementation for creating student
    return { message: 'Student created successfully' };
  }

  async addStudentToCenter(
    userId: string,
    centerId: string,
    dto?: AddStudentToCenterRequestDto,
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

    // Add user to center with Student role
    await this.prisma.userOnCenter.create({
      data: {
        userId,
        centerId,
        roleId: studentRole.id,
        createdBy: userId, // Self-created for now
        isActive: true,
      },
    });
  }

  async getStudentWithDetails(studentId: string) {
    // First get the student to find the user
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.profile) {
      throw new NotFoundException('Student profile not found');
    }

    // Then get the user with student profile
    const user = await this.prisma.user.findUnique({
      where: { id: student.profile.userId },
      include: {
        profile: {
          include: {
            student: true,
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

    return user;
  }

  async getAllStudents(currentUser: { id: string }) {
    // Get all users with student profiles
    const users = await this.prisma.user.findMany({
      where: {
        profile: {
          type: 'STUDENT',
        },
      },
      include: {
        profile: {
          include: {
            student: true,
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

    return users;
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
            profile: {
              include: {
                student: true,
              },
            },
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

    return userOnCenters.map((userOnCenter) => userOnCenter.user);
  }

  async getStudentCenters(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.profile) {
      throw new NotFoundException('Student profile not found');
    }

    const userOnCenters = await this.prisma.userOnCenter.findMany({
      where: {
        userId: student.profile.userId,
      },
      include: {
        center: true,
        role: true,
      },
    });

    return userOnCenters.map((userOnCenter) => ({
      center: userOnCenter.center,
      role: userOnCenter.role,
    }));
  }

  async updateStudent(
    id: string,
    dto: UpdateStudentRequestDto,
    userId: string,
  ) {
    // Implementation for updating student
    return { message: 'Student updated successfully' };
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
  }

  async deleteStudent(studentId: string) {
    // First get the student to find the user
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Delete the student (this will cascade to the profile)
    await this.prisma.student.delete({
      where: { id: studentId },
    });

    // Optionally, you might want to delete the user as well
    // await this.prisma.user.delete({
    //   where: { id: student.profile.userId },
    // });
  }

  async getStudentStats(studentId: string, centerId?: string) {
    // First get the student to find the user
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
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

    const stats = {
      totalSessions: student.attendance.length,
      presentSessions: student.attendance.filter((a) => a.status === 'PRESENT')
        .length,
      absentSessions: student.attendance.filter((a) => a.status === 'ABSENT')
        .length,
      lateSessions: student.attendance.filter((a) => a.status === 'LATE')
        .length,
      attendanceRate:
        student.attendance.length > 0
          ? (student.attendance.filter((a) => a.status === 'PRESENT').length /
              student.attendance.length) *
            100
          : 0,
      totalPayments: student.totalPayments,
      performanceScore: student.performanceScore,
    };

    return stats;
  }
}
