import { Injectable, Logger } from '@nestjs/common';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { SessionStatus } from '@/modules/sessions/enums/session-status.enum';
import { AttendanceErrors } from '../exceptions/attendance.errors';
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
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
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

  private async validateSessionAndAccess(sessionId: string, actor: ActorUser) {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    if (
      session.status !== SessionStatus.CHECKING_IN &&
      session.status !== SessionStatus.CONDUCTING
    ) {
      throw AttendanceErrors.attendanceSessionNotActive();
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
      throw AttendanceErrors.attendanceStudentNotEnrolled();
    }

    const codeVal = (
      studentUser as unknown as { userProfile?: { code?: unknown } }
    ).userProfile?.code;
    const studentCode = typeof codeVal === 'string' ? codeVal : undefined;

    // Check for outstanding class installments
    let paymentStatus;
    try {
      // Get the group to find the classId
      const group = await this.groupsRepository.findByIdOrThrow(attendance.groupId, [
        'class',
      ]);

      // Check for outstanding class installments
      const progress = await this.studentBillingService.getClassChargeProgress(
        studentUserProfileId,
        group.classId,
        actor,
      );

      // Only show payment status for class charges that are still in installment
      if (progress.payoutType === 'CLASS' && progress.payoutStatus === 'INSTALLMENT') {
        paymentStatus = {
          hasOutstandingInstallments: true,
          outstandingAmount: progress.remaining,
          totalAmount: progress.totalAmount,
          progress: progress.progress,
        };
      }
    } catch (error) {
      // If payment check fails, just don't include payment status
      // This ensures attendance marking still works even if billing check fails
    }

    return {
      id: attendance.id,
      sessionId: attendance.sessionId,
      groupId: attendance.groupId,
      studentUserProfileId: attendance.studentUserProfileId,
      status: attendance.status,
      markedByUserProfileId: attendance.markedByUserProfileId,
      student: {
        studentUserProfileId,
        fullName: studentUser.name,
        studentCode,
        photoUrl: undefined,
      },
      paymentStatus,
    };
  }

  async markAttendance(
    sessionId: string,
    userProfileId: string,
    actor: ActorUser,
  ): Promise<AttendanceResponseDto> {
    const { session, group } = await this.validateSessionAndAccess(
      sessionId,
      actor,
    );

    const membership = await this.groupStudentsRepository.findByGroupAndStudent(
      group.id,
      userProfileId,
    );

    console.log('membership', membership);

    if (!membership) {
      throw AttendanceErrors.attendanceStudentNotEnrolled();
    }

    // Check billing access - student must have paid for this session or have active monthly subscription
    const hasBillingAccess =
      await this.studentBillingService.checkStudentAccess(
        userProfileId,
        group.classId,
        sessionId,
      );

    console.log('hasBillingAccess', hasBillingAccess);

    if (!hasBillingAccess) {
      // Get payment strategy details for better error message
      const paymentStrategy =
        await this.studentBillingService.getClassPaymentStrategy(group.classId);
      throw AttendanceErrors.attendancePaymentRequired(paymentStrategy);
    }

    const now = new Date();
    const status = this.computeStatus(now, session.startTime);

    const existing = await this.attendanceRepository.findBySessionAndStudent(
      sessionId,
      userProfileId,
    );

    if (existing) {
      throw AttendanceErrors.attendanceAlreadyExists();
    }

    let attendance: Attendance;
    // TODO: handle this properly without try catch
    try {
      attendance = await this.attendanceRepository.create({
        centerId: session.centerId,
        branchId: session.branchId,
        groupId: session.groupId,
        sessionId: session.id,
        studentUserProfileId: userProfileId,
        status,
        markedByUserProfileId: actor.userProfileId,
      });
    } catch (e) {
      // Race-safe: if another request inserted the record first, return deterministic 409.
      const err = e as QueryFailedError & { code?: string };
      if (err?.code === '23505') {
        throw AttendanceErrors.attendanceAlreadyExists();
      }
      throw e;
    }

    return this.toAttendanceResponseDto(attendance, userProfileId, actor);
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
        status: query.status,
      },
    );

    return roster;
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

    const stats = {
      totalStudents:
        session.presentCount +
        session.lateCount +
        session.excusedCount +
        session.absentCount,
      present: session.presentCount,
      late: session.lateCount,
      excused: session.excusedCount,
      absent: session.absentCount,
    };

    return {
      sessionId: session.id,
      groupId: group.id,
      ...stats,
    };
  }

  async markAllAbsent(
    sessionId: string,
    actor: ActorUser,
  ): Promise<{ markedCount: number; sessionId: string }> {
    // Validate session and access
    await this.validateSessionAndAccess(sessionId, actor);

    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Get all unmarked students (no pagination for bulk operation)
    const unmarkedResult =
      await this.attendanceRepository.paginateUnmarkedStudents({
        sessionId,
        groupId: session.groupId,
        page: 1,
        limit: 1000, // Large limit to get all students
      });
    const unmarkedStudents = unmarkedResult.items;

    if (unmarkedStudents.length === 0) {
      return { markedCount: 0, sessionId };
    }

    // Create ABSENT records for all unmarked students
    const attendanceRecords: Partial<Attendance>[] = unmarkedStudents.map(
      (student) => ({
        centerId: session.centerId,
        branchId: session.branchId,
        groupId: session.groupId,
        sessionId,
        studentUserProfileId: student.studentUserProfileId,
        status: AttendanceStatus.ABSENT,
        markedByUserProfileId: actor.userProfileId,
      }),
    );

    // Bulk insert attendance records
    await this.attendanceRepository.bulkInsert(attendanceRecords);

    this.logger.log(
      `Marked ${attendanceRecords.length} students as absent for session ${sessionId}`,
      { actorId: actor.userProfileId },
    );

    return { markedCount: attendanceRecords.length, sessionId };
  }

  async getUnmarkedStudents(
    sessionId: string,
    query: BasePaginationDto,
    actor: ActorUser,
  ): Promise<
    Pagination<{
      studentUserProfileId: string;
      fullName: string;
      studentCode?: string;
    }>
  > {
    // Validate session and access
    await this.validateSessionAndAccess(sessionId, actor);

    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Get paginated unmarked students
    return this.attendanceRepository.paginateUnmarkedStudents({
      sessionId,
      groupId: session.groupId,
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
  }
}
