import {
  Injectable,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateGradeLevelRequest } from './dto/create-grade-level.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { PaginateQuery } from 'nestjs-paginate';

@Injectable()
export class GradeLevelsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Grade level management
  async createGradeLevel(dto: CreateGradeLevelRequest) {
    const gradeLevel = await this.prisma.gradeLevel.create({
      data: {
        name: dto.name,
        description: dto.description,
        level: dto.level,
        centerId: dto.centerId,
      },
    });
    this.logger.log(
      `Created grade level ${gradeLevel.id} with name ${dto.name}`,
    );
    return gradeLevel;
  }

  async updateGradeLevel(gradeLevelId: string, dto: CreateGradeLevelRequest) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    const updated = await this.prisma.gradeLevel.update({
      where: { id: gradeLevelId },
      data: { ...dto },
    });
    this.logger.log(`Updated grade level ${gradeLevelId}`);
    return updated;
  }

  async deleteGradeLevel(gradeLevelId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    await this.prisma.gradeLevel.delete({ where: { id: gradeLevelId } });
    this.logger.warn(`Deleted grade level ${gradeLevelId}`);
    return { success: true };
  }

  async getGradeLevelById(gradeLevelId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    this.logger.log(`Fetched grade level ${gradeLevelId}`);
    return gradeLevel;
  }

  async listGradeLevels(query: PaginateQuery): Promise<any> {
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
      'name' in query.filter
    ) {
      where.name = {
        contains: query.filter.name as string,
        mode: 'insensitive',
      };
    }
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { level: 'asc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [gradeLevels, total] = await Promise.all([
      this.prisma.gradeLevel.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.gradeLevel.count({ where }),
    ]);

    return {
      data: gradeLevels,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Assignment management
  async assignStudent(gradeLevelId: string, studentId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    await this.prisma.gradeLevel.update({
      where: { id: gradeLevelId },
      data: { students: { connect: { id: studentId } } },
    });
    this.logger.log(
      `Assigned student ${studentId} to grade level ${gradeLevelId}`,
    );
    return { success: true };
  }

  async unassignStudent(gradeLevelId: string, studentId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    await this.prisma.gradeLevel.update({
      where: { id: gradeLevelId },
      data: { students: { disconnect: { id: studentId } } },
    });
    this.logger.log(
      `Unassigned student ${studentId} from grade level ${gradeLevelId}`,
    );
    return { success: true };
  }

  async assignGroup(gradeLevelId: string, groupId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.prisma.group.update({
      where: { id: groupId },
      data: { gradeLevelId },
    });
    this.logger.log(`Assigned group ${groupId} to grade level ${gradeLevelId}`);
    return { success: true };
  }

  async unassignGroup(gradeLevelId: string, groupId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    await this.prisma.group.update({
      where: { id: groupId },
      data: { gradeLevelId: null },
    });
    this.logger.log(
      `Unassigned group ${groupId} from grade level ${gradeLevelId}`,
    );
    return { success: true };
  }

  async assignSubject(gradeLevelId: string, dto: AssignSubjectDto) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.prisma.subject.update({
      where: { id: dto.subjectId },
      data: { gradeLevelId },
    });
    this.logger.log(
      `Assigned subject ${dto.subjectId} to grade level ${gradeLevelId}`,
    );
    return { success: true };
  }

  async unassignSubject(gradeLevelId: string, subjectId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { gradeLevelId: null },
    });
    this.logger.log(
      `Unassigned subject ${subjectId} from grade level ${gradeLevelId}`,
    );
    return { success: true };
  }

  // List assignments
  async listStudents(gradeLevelId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id: gradeLevelId },
      include: { students: true },
    });
    if (!gradeLevel) throw new NotFoundException('Grade level not found');
    this.logger.log(`Listed students for grade level ${gradeLevelId}`);
    return gradeLevel.students;
  }

  async listGroups(gradeLevelId: string) {
    const groups = await this.prisma.group.findMany({
      where: { gradeLevelId },
    });
    this.logger.log(`Listed groups for grade level ${gradeLevelId}`);
    return groups;
  }

  async listSubjects(gradeLevelId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { gradeLevelId },
    });
    this.logger.log(`Listed subjects for grade level ${gradeLevelId}`);
    return subjects;
  }
}
