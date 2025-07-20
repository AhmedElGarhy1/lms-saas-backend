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

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Subject management
  async createSubject(dto: any) {
    const subject = await this.prisma.subject.create({
      data: {
        name: dto.name,
        description: dto.description,
        centerId: dto.centerId,
        gradeLevelId: dto.gradeLevelId,
        credits: dto.credits,
        duration: dto.duration,
      },
    });
    this.logger.log(`Created subject ${subject.id} with name ${dto.name}`);
    return subject;
  }

  async updateSubject(subjectId: string, dto: any) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    const updated = await this.prisma.subject.update({
      where: { id: subjectId },
      data: { ...dto },
    });
    this.logger.log(`Updated subject ${subjectId}`);
    return updated;
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
    // Get all centerIds this user can access
    const centerAccesses = await this.prisma.centerAccess.findMany({
      where: { userId: currentUserId },
      select: { centerId: true },
    });
    const accessibleCenterIds = centerAccesses.map((a) => a.centerId);
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
  async assignTeacher(subjectId: string, teacherId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is already assigned to the subject
    const existingTeacher = await this.prisma.subject.findFirst({
      where: { id: subjectId, teachers: { some: { id: teacherId } } },
    });
    if (existingTeacher)
      throw new BadRequestException('Teacher already assigned to subject');

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { teachers: { connect: { id: teacherId } } },
    });
    this.logger.log(`Assigned teacher ${teacherId} to subject ${subjectId}`);
    return { success: true };
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
