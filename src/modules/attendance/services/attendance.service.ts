import { Injectable, Logger } from '@nestjs/common';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { SessionStatus } from '@/modules/sessions/enums/session-status.enum';
import {
  BusinessLogicException,
  ResourceAlreadyExistsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { QueryFailedError } from 'typeorm';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { GroupStudentsRepository } from '@/modules/classes/repositories/group-students.repository';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ATTENDANCE_LATE_GRACE_MINUTES } from '../constants/attendance.constants';
import { Attendance } from '../entities/attendance.entity';
import { UserService } from '@/modules/user/services/user.service';
import { SessionRosterStudentDto } from '../dto/session-roster-response.dto';

import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { UserProfileRepository } from '@/modules/user-profile/repositories/user-profile.repository';
import { PaginateSessionRosterDto } from '../dto/paginate-session-roster.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { SessionAttendanceStatsDto } from '../dto/session-attendance-stats.dto';
import { StudentBillingService } from '@/modules/student-billing/services/student-billing.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
    private readonly userService: UserService,
    private readonly userProfileRepository: UserProfileRepository,
    private readonly studentBillingService: StudentBillingService,
  ) {}

  private async resolveStudentUserProfileIdFromCode(
    studentCode: string,
  ): Promise<string> {
    // Backend bouncer: scan endpoint only accepts Student codes.
    if (!studentCode.startsWith('STU-')) {
      throw new BusinessLogicException("Operation failed");
    }

    const profile =
      await this.userProfileRepository.findActiveStudentProfileByCode(
        studentCode,
      );

    if (!profile) {
      throw new BusinessLogicException("Operation failed");
    }

    return profile.id;
  }

  private async validateSessionAndAccess(sessionId: string, actor: ActorUser) {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    if (
      session.status !== SessionStatus.CHECKING_IN &&
      session.status !== SessionStatus.CONDUCTING
    ) {
      throw new BusinessLogicException("Operation failed");
    }

    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    return { session, group };
  }

  private computeStatus(now: Date, scheduledStartTime: Date): AttendanceStatus {
    const graceMs = ATTENDANCE_LATE_GRACE_MINUTES * 60 * 1000;
    return now.getTime() > scheduledStartTime.getTime() + graceMs
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;
  }

  private async toAttendanceResponseDto(
    attendance: Attendance,
    studentUserProfileId: string,
    actor: ActorUser,
  ): Promise<AttendanceResponseDto> {
    const studentUser = await this.userService.findStudentUserByProfileId(
      studentUserProfileId,
      actor,
      false,
    );

    if (!studentUser) {
      throw new BusinessLogicException("Operation failed");
    }

    const codeVal = (
      studentUser as unknown as { userProfile?: { code?: unknown } }
    ).userProfile?.code;
    const studentCode = typeof codeVal === 'string' ? codeVal : undefined;

    return {
      id: attendance.id,
      sessionId: attendance.sessionId,
      groupId: attendance.groupId,
      studentUserProfileId: attendance.studentUserProfileId,
      status: attendance.status,
      lastScannedAt: attendance.lastScannedAt,
      isManuallyMarked: attendance.isManuallyMarked,
      markedByUserProfileId: attendance.markedByUserProfileId,
      student: {
        studentUserProfileId,
        fullName: studentUser.name,
        studentCode,
        photoUrl: undefined,
      },
    };
  }

  async scan(
    sessionId: string,
    studentCode: string,
    actor: ActorUser,
  ): Promise<AttendanceResponseDto> {
    const studentUserProfileId =
      await this.resolveStudentUserProfileIdFromCode(studentCode);
    const { session, group } = await this.validateSessionAndAccess(
      sessionId,
      actor,
    );

    const membership = await this.groupStudentsRepository.findByGroupAndStudent(
      group.id,
      studentUserProfileId,
    );

    if (!membership) {
      throw new BusinessLogicException("Operation failed");
    }

    // Check billing access - student must have paid for this session or have active monthly subscription
    const hasBillingAccess =
      await this.studentBillingService.checkStudentAccess(
        studentUserProfileId,
        group.classId,
        sessionId,
      );

    if (!hasBillingAccess) {
      throw new BusinessLogicException("Operation failed");
    }

    const now = new Date();
    const status = this.computeStatus(now, session.startTime);

    const existing = await this.attendanceRepository.findBySessionAndStudent(
      sessionId,
      studentUserProfileId,
    );

    if (existing) {
      throw new ResourceAlreadyExistsException("Operation failed");
    }

    let attendance: Attendance;
    // TODO: handle this properly without try catch
    try {
      attendance = await this.attendanceRepository.create({
        centerId: session.centerId,
        branchId: session.branchId,
        groupId: session.groupId,
        sessionId: session.id,
        studentUserProfileId,
        status,
        lastScannedAt: now,
        isManuallyMarked: false,
        markedByUserProfileId: actor.userProfileId,
      });
    } catch (e) {
      // Race-safe: if another request inserted the record first, return deterministic 409.
      const err = e as QueryFailedError & { code?: string };
      if (err?.code === '23505') {
        throw new ResourceAlreadyExistsException("Operation failed");
      }
      throw e;
    }

    return this.toAttendanceResponseDto(
      attendance,
      studentUserProfileId,
      actor,
    );
  }

  async manualMark(
    sessionId: string,
    studentCode: string,
    actor: ActorUser,
  ): Promise<AttendanceResponseDto> {
    const studentUserProfileId =
      await this.resolveStudentUserProfileIdFromCode(studentCode);
    const { session, group } = await this.validateSessionAndAccess(
      sessionId,
      actor,
    );

    const membership = await this.groupStudentsRepository.findByGroupAndStudent(
      group.id,
      studentUserProfileId,
    );

    if (!membership) {
      throw new BusinessLogicException("Operation failed");
    }

    // Check billing access - student must have paid for this session or have active monthly subscription
    const hasBillingAccess =
      await this.studentBillingService.checkStudentAccess(
        studentUserProfileId,
        group.classId,
        sessionId,
      );

    if (!hasBillingAccess) {
      throw new BusinessLogicException("Operation failed");
    }

    const now = new Date();
    const status = AttendanceStatus.PRESENT;

    const existing = await this.attendanceRepository.findBySessionAndStudent(
      sessionId,
      studentUserProfileId,
    );

    if (existing) {
      throw new ResourceAlreadyExistsException("Operation failed");
    }

    let attendance: Attendance;
    try {
      attendance = await this.attendanceRepository.create({
        centerId: session.centerId,
        branchId: session.branchId,
        groupId: session.groupId,
        sessionId: session.id,
        studentUserProfileId,
        status,
        lastScannedAt: now,
        isManuallyMarked: true,
        markedByUserProfileId: actor.userProfileId,
      });
    } catch (e) {
      const err = e as QueryFailedError & { code?: string };
      if (err?.code === '23505') {
        throw new ResourceAlreadyExistsException("Operation failed");
      }
      throw e;
    }

    return this.toAttendanceResponseDto(
      attendance,
      studentUserProfileId,
      actor,
    );
  }

  async getSessionRoster(
    sessionId: string,
    query: PaginateSessionRosterDto,
    actor: ActorUser,
  ): Promise<Pagination<SessionRosterStudentDto>> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    const roster = await this.attendanceRepository.paginateRosterWithAttendance(
      {
        sessionId,
        groupId: group.id,
        page: query.page,
        limit: query.limit,
        search: query.search,
      },
    );

    return roster;
  }

  async autoMarkAbsenteesOnSessionFinished(
    sessionId: string,
    actor: ActorUser,
  ): Promise<number> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // If called redundantly, keep it safe (idempotent at SQL level anyway).
    if (session.status !== SessionStatus.FINISHED) {
      return 0;
    }

    return this.attendanceRepository.bulkInsertAbsentForMissingStudents({
      sessionId: session.id,
      groupId: session.groupId,
      centerId: session.centerId,
      branchId: session.branchId,
      createdByUserId: actor.id,
      markedByUserProfileId: actor.userProfileId,
    });
  }

  async getSessionAttendanceStats(
    sessionId: string,
    actor: ActorUser,
  ): Promise<SessionAttendanceStatsDto> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    const stats = await this.attendanceRepository.getSessionAttendanceStats({
      sessionId: session.id,
      groupId: group.id,
    });

    return {
      sessionId: session.id,
      groupId: group.id,
      ...stats,
    };
  }
}
