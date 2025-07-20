import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignStudentDto } from '../shared/dto/assign-student.dto';
import { AssignTeacherDto } from '../shared/dto/assign-teacher.dto';
import { PaginateQuery } from 'nestjs-paginate';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Group management
  async createGroup(dto: CreateGroupDto) {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        centerId: dto.centerId,
        gradeLevelId: dto.gradeLevelId,
        maxStudents: dto.maxStudents,
      },
    });
    this.logger.log(`Created group ${group.id} with name ${dto.name}`);
    return group;
  }

  async updateGroup(groupId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: { ...dto },
    });
    this.logger.log(`Updated group ${groupId}`);
    return updated;
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.prisma.group.delete({ where: { id: groupId } });
    this.logger.warn(`Deleted group ${groupId}`);
    return { success: true };
  }

  async getGroupById(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    this.logger.log(`Fetched group ${groupId}`);
    return group;
  }

  async listGroups(query: PaginateQuery): Promise<any> {
    const where: any = {};
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'centerId' in query.filter
    ) {
      where.centerId = query.filter.centerId as string;
    }
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'gradeLevelId' in query.filter
    ) {
      where.gradeLevelId = query.filter.gradeLevelId as string;
    }
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
      : { name: 'asc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      data: groups,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Assignment management
  async assignStudent(groupId: string, dto: AssignStudentDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Check if student is already in the group
    const existingStudent = await this.prisma.group.findFirst({
      where: { id: groupId, students: { some: { id: dto.studentId } } },
    });
    if (existingStudent)
      throw new BadRequestException('Student already in group');

    // Check max students limit
    if (group.maxStudents) {
      const studentCount = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: { students: true },
      });
      if ((studentCount?.students?.length ?? 0) >= group.maxStudents) {
        throw new BadRequestException(
          'Group has reached maximum student capacity',
        );
      }
    }

    await this.prisma.group.update({
      where: { id: groupId },
      data: { students: { connect: { id: dto.studentId } } },
    });
    this.logger.log(`Assigned student ${dto.studentId} to group ${groupId}`);
    return { success: true };
  }

  async unassignStudent(groupId: string, studentId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.prisma.group.update({
      where: { id: groupId },
      data: { students: { disconnect: { id: studentId } } },
    });
    this.logger.log(`Unassigned student ${studentId} from group ${groupId}`);
    return { success: true };
  }

  async assignTeacher(groupId: string, dto: AssignTeacherDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is already assigned to the group
    const existingTeacher = await this.prisma.group.findFirst({
      where: { id: groupId, teachers: { some: { id: dto.teacherId } } },
    });
    if (existingTeacher)
      throw new BadRequestException('Teacher already assigned to group');

    await this.prisma.group.update({
      where: { id: groupId },
      data: { teachers: { connect: { id: dto.teacherId } } },
    });
    this.logger.log(`Assigned teacher ${dto.teacherId} to group ${groupId}`);
    return { success: true };
  }

  async unassignTeacher(groupId: string, teacherId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.prisma.group.update({
      where: { id: groupId },
      data: { teachers: { disconnect: { id: teacherId } } },
    });
    this.logger.log(`Unassigned teacher ${teacherId} from group ${groupId}`);
    return { success: true };
  }

  // List assignments
  async listStudents(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { students: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    this.logger.log(`Listed students for group ${groupId}`);
    return group.students;
  }

  async listTeachers(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { teachers: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    this.logger.log(`Listed teachers for group ${groupId}`);
    return group.teachers;
  }
}
