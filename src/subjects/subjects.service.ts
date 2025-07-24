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
import { CreateSubjectRequestDto } from './dto/create-subject.dto';
import { UpdateSubjectRequestDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Subject management
  async createSubject(dto: CreateSubjectRequestDto, userId: string) {
    // Implementation for creating subject
    return { message: 'Subject created successfully' };
  }

  async updateSubject(
    id: string,
    dto: UpdateSubjectRequestDto,
    userId: string,
  ) {
    // Implementation for updating subject
    return { message: 'Subject updated successfully' };
  }

  async deleteSubject(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.prisma.subject.delete({ where: { id: subjectId } });
    this.logger.warn(`Deleted subject ${subjectId}`);
    return { success: true };
  }

  async getSubjectById(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    this.logger.log(`Fetched subject ${subjectId}`);
    return subject;
  }

  async listSubjects(
    query: PaginateQuery,
    currentUserId: string,
  ): Promise<any> {
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

    const [subjects, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return {
      data: subjects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Assignment management
  async assignTeacher(subjectId: string, teacherId: string, userId: string) {
    // Implementation for assigning teacher to subject
    return { message: 'Teacher assigned to subject successfully' };
  }

  async unassignTeacher(subjectId: string, teacherId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { teachers: { disconnect: { id: teacherId } } },
    });
    this.logger.log(
      `Unassigned teacher ${teacherId} from subject ${subjectId}`,
    );
    return { success: true };
  }

  // List assignments
  async listTeachers(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      include: { teachers: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    this.logger.log(`Listed teachers for subject ${subjectId}`);
    return subject.teachers;
  }
}
