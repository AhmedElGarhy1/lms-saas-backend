import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '../shared/types/current-user.type';

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
    dto: CreateSessionDto,
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
    dto: UpdateSessionDto,
    currentUser: CurrentUser,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!(await this.canManageSession(currentUser, session)))
      throw new ForbiddenException('Access denied');
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
      throw new ForbiddenException('Access denied');
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

  async listSessions(
    query: QuerySessionsDto,
    currentUser: CurrentUser,
  ): Promise<{
    sessions: SessionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      teacherId,
      centerId,
      groupId,
      subjectId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = query;
    const where: any = {};
    if (teacherId) where.teacherId = teacherId;
    if (centerId) where.centerId = centerId;
    if (groupId) where.groupId = groupId;
    if (subjectId) where.subjectId = subjectId;
    if (dateFrom || dateTo) {
      where.AND = [];
      if (dateFrom) where.AND.push({ startTime: { gte: new Date(dateFrom) } });
      if (dateTo) where.AND.push({ endTime: { lte: new Date(dateTo) } });
    }
    // RBAC: Only authorized users or students in group can view
    // ...
    const [sessions, total] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { teacher: true, center: true, group: true, subject: true },
      }),
      this.prisma.classSession.count({ where }),
    ]);
    this.logger.log(`Sessions listed by user ${currentUser.id}`);
    return {
      sessions: sessions.map(toSessionResponseDto),
      total,
      page,
      limit,
    };
  }
}
