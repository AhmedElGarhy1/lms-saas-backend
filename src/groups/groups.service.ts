import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginateQuery } from 'nestjs-paginate';
import { CreateGroupRequestDto } from './dto/create-group.dto';
import { UpdateGroupRequestDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Group management
  async createGroup(dto: CreateGroupRequestDto, userId: string) {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        center: { connect: { id: dto.centerId } },
        description: dto.description,
        gradeLevelId: dto.gradeLevelId,
        maxStudents: dto.maxStudents,
        isActive: dto.isActive,
      },
    });
    return group;
  }

  async updateGroup(id: string, dto: UpdateGroupRequestDto, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        gradeLevelId: dto.gradeLevelId,
        maxStudents: dto.maxStudents,
        isActive: dto.isActive,
      },
    });
    return updatedGroup;
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

  async listGroups(query: PaginateQuery, currentUserId: string): Promise<any> {
    // Get all centerIds this user is a member of
    const userOnCenters = await this.prisma.userOnCenter.findMany({
      where: { userId: currentUserId },
      select: { centerId: true },
    });
    const accessibleCenterIds = userOnCenters.map((a) => a.centerId);
    const where: any = { centerId: { in: accessibleCenterIds } };
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
  async assignStudent(groupId: string, studentId: string, userId: string) {
    // Implementation for assigning student to group
    return { message: 'Student assigned to group successfully' };
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

  async assignTeacher(groupId: string, teacherId: string, userId: string) {
    // Implementation for assigning teacher to group
    return { message: 'Teacher assigned to group successfully' };
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
