import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateSessionRequest } from './dto/create-session.dto';
import { UpdateSessionRequest } from './dto/update-session.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { CurrentUser } from '../shared/types/current-user.type';
import { SessionResponseDto } from './dto/session-response.dto';

function toSessionResponseDto(session: any): SessionResponseDto {
  return {
    ...session,
    startTime: session.startTime?.toISOString(),
    endTime: session.endTime?.toISOString(),
    createdAt: session.createdAt?.toISOString(),
    updatedAt: session.updatedAt?.toISOString(),
  };
}

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // RBAC stub: replace with real logic
  private async canManageSession(
    currentUser: CurrentUser,
    session: any,
  ): Promise<boolean> {
    // Admins, center owners, teacher of the session can manage
    if (currentUser.userRoles?.some((r) => r.role?.name === 'Admin'))
      return true;
    if (
      session.centerId &&
      currentUser.centersOwned?.some((c) => c.id === session.centerId)
    )
      return true;
    if (session.teacherId && session.teacherId === currentUser.id) return true;
    return false;
  }

  async createSession(
    dto: CreateSessionRequest,
    currentUser: CurrentUser,
  ): Promise<SessionResponseDto> {
    // RBAC: Only authorized users can create
    // ...
    const session = await this.prisma.classSession.create({
      data: { ...dto },
      include: { teacher: true, center: true, group: true, subject: true },
    });
    this.logger.log(`Session created: ${session.id} by user ${currentUser.id}`);
    return toSessionResponseDto(session);
  }

  async updateSession(
    id: string,
    dto: UpdateSessionRequest,
    currentUser: CurrentUser,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!(await this.canManageSession(currentUser, session)))
      throw new BadRequestException('Access denied');
    const updated = await this.prisma.classSession.update({
      where: { id },
      data: { ...dto },
      include: { teacher: true, center: true, group: true, subject: true },
    });
    this.logger.log(`Session updated: ${id} by user ${currentUser.id}`);
    return toSessionResponseDto(updated);
  }

  async deleteSession(id: string, currentUser: CurrentUser): Promise<void> {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!(await this.canManageSession(currentUser, session)))
      throw new BadRequestException('Access denied');
    await this.prisma.classSession.delete({ where: { id } });
    this.logger.log(`Session deleted: ${id} by user ${currentUser.id}`);
  }

  async getSessionById(
    id: string,
    currentUser: CurrentUser,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: { teacher: true, center: true, group: true, subject: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    // RBAC: Only authorized users or students in group can view
    // ...
    return toSessionResponseDto(session);
  }

  async listSessions(query: PaginateQuery): Promise<any> {
    const where: any = {};
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'teacherId' in query.filter
    ) {
      where.teacherId = query.filter.teacherId as string;
    }
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
      'groupId' in query.filter
    ) {
      where.groupId = query.filter.groupId as string;
    }
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'subjectId' in query.filter
    ) {
      where.subjectId = query.filter.subjectId as string;
    }
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'dateFrom' in query.filter
    ) {
      where.AND = where.AND || [];
      where.AND.push({
        startTime: { gte: new Date(query.filter.dateFrom as string) },
      });
    }
    if (
      query.filter &&
      typeof query.filter === 'object' &&
      'dateTo' in query.filter
    ) {
      where.AND = where.AND || [];
      where.AND.push({
        endTime: { lte: new Date(query.filter.dateTo as string) },
      });
    }
    const orderBy = query.sortBy?.length
      ? { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' }
      : { startTime: 'asc' as const };

    // Manual pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        include: {
          teacher: true,
          group: true,
          subject: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.classSession.count({ where }),
    ]);

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
