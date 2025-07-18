import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Subject management
  async createSubject(dto: CreateSubjectDto) {
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

  async updateSubject(subjectId: string, dto: UpdateSubjectDto) {
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

  async listSubjects(centerId?: string, gradeLevelId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (gradeLevelId) where.gradeLevelId = gradeLevelId;

    const subjects = await this.prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    this.logger.log(
      `Listed subjects for center ${centerId || 'all'} and grade ${gradeLevelId || 'all'}`,
    );
    return subjects;
  }

  // Assignment management
  async assignTeacher(subjectId: string, dto: AssignTeacherDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is already assigned to the subject
    const existingTeacher = await this.prisma.subject.findFirst({
      where: { id: subjectId, teachers: { some: { id: dto.teacherId } } },
    });
    if (existingTeacher)
      throw new BadRequestException('Teacher already assigned to subject');

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { teachers: { connect: { id: dto.teacherId } } },
    });
    this.logger.log(
      `Assigned teacher ${dto.teacherId} to subject ${subjectId}`,
    );
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
