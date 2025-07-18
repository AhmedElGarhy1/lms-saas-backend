import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '../shared/types/current-user.type';
import { StudentWithRelations } from '../shared/types/student-with-relations.type';
import { User, Student } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Helper: RBAC check (stub, replace with real logic)
  private async canManageStudent(
    currentUser: CurrentUser,
    student: StudentWithRelations,
  ): Promise<boolean> {
    // Admins can manage all
    if (
      currentUser.userRoles?.some(
        (r: { role?: { name: string } }) => r.role?.name === 'Admin',
      )
    )
      return true;
    // Center owner/admin/assistant can manage students in their center
    if (
      student.centerId &&
      currentUser.centersOwned?.some(
        (c: { id: string }) => c.id === student.centerId,
      )
    )
      return true;
    // Teacher can manage their own students
    if (student.teacherId && student.teacherId === currentUser.id) return true;
    // Student can view their own profile
    if (student.userId === currentUser.id) return true;
    return false;
  }

  async createStudent(
    dto: CreateStudentDto,
    currentUser: CurrentUser,
  ): Promise<StudentResponseDto> {
    // Only teacher, assistant, center owner/admin can create
    // (Add real RBAC logic here)
    // ...
    const student = await this.prisma.student.create({
      data: { ...dto },
      include: {
        user: true,
        teacher: true,
        center: true,
        guardian: true,
        groups: true,
      },
    });
    this.logger.log(`Student created: ${student.id} by user ${currentUser.id}`);
    return student as StudentResponseDto;
  }

  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    currentUser: CurrentUser,
  ): Promise<StudentResponseDto> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Student not found');
    if (!(await this.canManageStudent(currentUser, student)))
      throw new ForbiddenException('Access denied');
    const updated = await this.prisma.student.update({
      where: { id },
      data: { ...dto },
      include: {
        user: true,
        teacher: true,
        center: true,
        guardian: true,
        groups: true,
      },
    });
    this.logger.log(`Student updated: ${id} by user ${currentUser.id}`);
    return updated as StudentResponseDto;
  }

  async deleteStudent(id: string, currentUser: CurrentUser): Promise<void> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Student not found');
    if (!(await this.canManageStudent(currentUser, student)))
      throw new ForbiddenException('Access denied');
    await this.prisma.student.delete({ where: { id } });
    this.logger.log(`Student deleted: ${id} by user ${currentUser.id}`);
  }

  async getStudentById(
    id: string,
    currentUser: CurrentUser,
  ): Promise<StudentResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        teacher: true,
        center: true,
        guardian: true,
        groups: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!(await this.canManageStudent(currentUser, student)))
      throw new ForbiddenException('Access denied');
    return student as StudentResponseDto;
  }

  async getStudentByUserId(
    userId: string,
    currentUser: CurrentUser,
  ): Promise<StudentResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        teacher: true,
        center: true,
        guardian: true,
        groups: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!(await this.canManageStudent(currentUser, student)))
      throw new ForbiddenException('Access denied');
    return student as StudentResponseDto;
  }

  async listStudents(
    query: QueryStudentsDto,
    currentUser: CurrentUser,
  ): Promise<{
    students: StudentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { centerId, teacherId, grade, page = 1, limit = 10 } = query;
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (teacherId) where.teacherId = teacherId;
    if (grade) where.grade = grade;
    // RBAC: Only admins can list all, others must filter by their center/teacher
    // (Add real RBAC logic here)
    // ...
    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: true,
          teacher: true,
          center: true,
          guardian: true,
          groups: true,
        },
      }),
      this.prisma.student.count({ where }),
    ]);
    this.logger.log(`Students listed by user ${currentUser.id}`);
    return {
      students: students as StudentResponseDto[],
      total,
      page,
      limit,
    };
  }
}
