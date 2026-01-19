import { Injectable } from '@nestjs/common';
import { Session } from '../entities/session.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { SessionStatus } from '../enums/session-status.enum';
import { CalendarSessionsDto } from '../dto/calendar-sessions.dto';
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { SelectQueryBuilder } from 'typeorm';
import { subHours } from 'date-fns';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { SessionsErrors } from '../exceptions/sessions.errors';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { SESSION_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { StudentPaymentType } from '@/modules/classes/enums/student-payment-type.enum';

@Injectable()
export class SessionsRepository extends BaseRepository<Session> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    protected readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Session {
    return Session;
  }

  /**
   * Find session by ID with relations
   */
  async findByIdWithRelations(
    sessionId: string,
    relations: string[] = [],
  ): Promise<Session> {
    const queryBuilder = this.getRepository().createQueryBuilder('session');

    // Add relations dynamically
    for (const relation of relations) {
      queryBuilder.leftJoinAndSelect(
        `session.${relation}`,
        relation.replace('.', '_'),
      );
    }

    const session = await queryBuilder
      .where('session.id = :id', { id: sessionId })
      .getOne();

    if (!session) {
      throw SessionsErrors.sessionNotFound();
    }

    return session;
  }

  /**
   * Generic method to find sessions with flexible filters and relations
   * This method reduces method explosion by allowing dynamic query building
   * @param filters - Filter criteria for sessions
   * @param relations - Optional array of relation names to load (e.g., ['group', 'group.class'])
   * @returns Array of sessions matching the filters
   */
  private async findSessions(
    filters: {
      groupId?: string;
      scheduleItemId?: string;
      status?: any;
      startTimeFrom?: Date;
      startTimeTo?: Date;
      startTimeAfter?: Date;
      excludeSessionId?: string;
    },
    relations?: string[],
  ): Promise<Session[]> {
    const queryBuilder = this.getRepository().createQueryBuilder('session');

    // Load relations if specified
    if (relations && relations.length > 0) {
      for (const relation of relations) {
        queryBuilder.leftJoinAndSelect(`session.${relation}`, relation);
      }
    }

    // Apply filters
    if (filters.groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', {
        groupId: filters.groupId,
      });
    }

    if (filters.scheduleItemId) {
      queryBuilder.andWhere('session.scheduleItemId = :scheduleItemId', {
        scheduleItemId: filters.scheduleItemId,
      });
    }

    if (filters.status !== undefined) {
      queryBuilder.andWhere('session.status = :status', {
        status: filters.status,
      });
    }

    if (filters.startTimeFrom) {
      queryBuilder.andWhere('session.startTime >= :startTimeFrom', {
        startTimeFrom: filters.startTimeFrom,
      });
    }

    if (filters.startTimeTo) {
      queryBuilder.andWhere('session.startTime <= :startTimeTo', {
        startTimeTo: filters.startTimeTo,
      });
    }

    if (filters.startTimeAfter) {
      queryBuilder.andWhere('session.startTime > :startTimeAfter', {
        startTimeAfter: filters.startTimeAfter,
      });
    }

    if (filters.excludeSessionId) {
      queryBuilder.andWhere('session.id != :excludeSessionId', {
        excludeSessionId: filters.excludeSessionId,
      });
    }

    return queryBuilder.orderBy('session.startTime', 'ASC').getMany();
  }

  /**
   * Find overlapping sessions within a group
   * @param groupId - Group ID
   * @param startTime - Session start time
   * @param endTime - Session end time
   * @param excludeSessionId - Optional session ID to exclude from check
   * @returns Array of overlapping sessions
   */
  async findOverlappingSessionsByGroup(
    groupId: string,
    startTime: Date,
    endTime: Date,
    excludeSessionId?: string,
  ): Promise<Session[]> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      .where('session.groupId = :groupId', { groupId })
      .andWhere(
        '(session.startTime < :endTime AND session.endTime > :startTime)',
        { startTime, endTime },
      );

    if (excludeSessionId) {
      queryBuilder.andWhere('session.id != :excludeSessionId', {
        excludeSessionId,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Find a session by ID with all required relations loaded
   * Used for single session retrieval to ensure consistent response structure
   *
   * @param sessionId - Session ID
   * @returns Session with relations (group, branch, class, teacher, teacher.user)
   * @throws SessionsErrors.sessionNotFound() if session doesn't exist
   */
  async findSessionWithRelationsOrThrow(sessionId: string): Promise<Session> {
    const session = await this.getRepository()
      .createQueryBuilder('session')
      // Join relations for name fields only (not full entities)
      .leftJoin('session.group', 'group')
      .leftJoin('session.class', 'class')
      .leftJoin('session.branch', 'branch')
      .leftJoin('session.center', 'center')
      .leftJoin('session.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      // Add name and id fields as selections
      .addSelect([
        'group.id',
        'group.name',
        'class.id',
        'class.name',
        'branch.id',
        'branch.city',
        'center.id',
        'center.name',
        'teacher.id',
        'teacherUser.id',
        'teacherUser.name',
      ])
      .where('session.id = :sessionId', { sessionId })
      .getOne();

    if (!session) {
      throw SessionsErrors.sessionNotFound();
    }

    return session;
  }

  /**
   * Get sessions for calendar view
   * Returns sessions within the specified date range with all necessary relations
   *
   * @param dto - Calendar sessions DTO with filters and date range
   * @param actor - The user performing the action
   * @returns Array of sessions with relations loaded
   */
  async getCalendarSessions(
    dto: CalendarSessionsDto,
    actor: ActorUser,
  ): Promise<Session[]> {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      .where('session.centerId = :centerId', { centerId });

    // Access control: Filter by class staff for non-bypass users (same as pagination)
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    if (!canBypassCenterInternalAccess) {
      queryBuilder
        .leftJoin('session.class', 'class')
        .leftJoin('class.classStaff', 'classStaff')
        .andWhere('classStaff.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        });

      // Branch access filtering
      queryBuilder.andWhere(
        'session.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId)',
        {
          userProfileId: actor.userProfileId,
        },
      );
    }

    // Apply date range filter - dates are already UTC Date objects (converted by @IsoUtcDate decorator)
    // Use them directly - no timezone conversion needed
    // CRITICAL: Use >= for start (inclusive) and < for end (exclusive) to preserve index usage
    queryBuilder
      .andWhere('session.startTime >= :dateFrom', { dateFrom: dto.dateFrom })
      .andWhere('session.startTime < :dateTo', { dateTo: dto.dateTo });

    // Apply other filters
    if (dto.groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', {
        groupId: dto.groupId,
      });
    }

    if (dto.classId) {
      // Use denormalized field instead of joining through group
      queryBuilder.andWhere('session.classId = :classId', {
        classId: dto.classId,
      });
    }

    if (dto.branchId) {
      // Use denormalized field
      queryBuilder.andWhere('session.branchId = :branchId', {
        branchId: dto.branchId,
      });
    }

    if (dto.teacherUserProfileId) {
      // Filter by teacher user profile ID (now denormalized on session)
      queryBuilder.andWhere(
        'session.teacherUserProfileId = :teacherUserProfileId',
        {
          teacherUserProfileId: dto.teacherUserProfileId,
        },
      );
    }

    if (dto.studentUserProfileId) {
      // Filter by student user profile ID via group_students join
      // Only include active students (leftAt IS NULL)
      queryBuilder
        .leftJoin('session.group', 'group')
        .leftJoin('group.groupStudents', 'groupStudents')
        .andWhere(
          'groupStudents.studentUserProfileId = :studentUserProfileId',
          {
            studentUserProfileId: dto.studentUserProfileId,
          },
        )
        .andWhere('groupStudents.leftAt IS NULL');
    }

    if (dto.status !== undefined && dto.status !== null) {
      queryBuilder.andWhere('session.status = :status', {
        status: dto.status,
      });
    }

    // Order by start time
    queryBuilder.orderBy('session.startTime', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Paginate sessions for a center with filtering and search capabilities.
   *
   * @param paginateDto - Pagination and filter parameters
   * @param actor - The user performing the action
   * @returns Paginated list of sessions
   */
  async paginateSessions(
    paginateDto: PaginateSessionsDto,
    actor: ActorUser,
  ): Promise<Pagination<Session>> {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      // Join relations for name fields only (not full entities)
      .leftJoin('session.group', 'group')
      .leftJoin('session.class', 'class')
      .leftJoin('session.branch', 'branch')
      .leftJoin('session.center', 'center')
      .leftJoin('session.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      // Add name and id fields as selections
      .addSelect([
        'group.id',
        'group.name',
        'class.id',
        'class.name',
        'branch.id',
        'branch.city',
        'center.id',
        'center.name',
        'teacher.id',
        'teacherUser.id',
        'teacherUser.name',
      ])
      // Filter by center using denormalized field (no join needed)
      .where('session.centerId = :centerId', { centerId });

    // Access control: Filter by class staff for non-bypass users
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    if (!canBypassCenterInternalAccess) {
      queryBuilder
        .leftJoin('class.classStaff', 'classStaff')
        .andWhere('classStaff.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        });

      // Branch access filtering
      queryBuilder.andWhere(
        'session.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId)',
        {
          userProfileId: actor.userProfileId,
        },
      );
    }

    // Apply paginateDto
    if (paginateDto.groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', {
        groupId: paginateDto.groupId,
      });
    }

    if (paginateDto.classId) {
      // Use denormalized field instead of joining through group
      queryBuilder.andWhere('session.classId = :classId', {
        classId: paginateDto.classId,
      });
    }

    if (paginateDto.branchId) {
      // Use denormalized field
      queryBuilder.andWhere('session.branchId = :branchId', {
        branchId: paginateDto.branchId,
      });
    }

    if (paginateDto.teacherUserProfileId) {
      // Filter by teacher user profile ID (now denormalized on session)
      queryBuilder.andWhere(
        'session.teacherUserProfileId = :teacherUserProfileId',
        {
          teacherUserProfileId: paginateDto.teacherUserProfileId,
        },
      );
    }

    if (paginateDto.studentUserProfileId) {
      // Filter by student user profile ID via group_students join
      // Only include active students (leftAt IS NULL)
      queryBuilder
        .leftJoin('group.groupStudents', 'groupStudents')
        .andWhere(
          'groupStudents.studentUserProfileId = :studentUserProfileId',
          {
            studentUserProfileId: paginateDto.studentUserProfileId,
          },
        )
        .andWhere('groupStudents.leftAt IS NULL');
    }

    if (paginateDto.status !== undefined && paginateDto.status !== null) {
      queryBuilder.andWhere('session.status = :status', {
        status: paginateDto.status,
      });
    }

    if (paginateDto.studentPaymentType) {
      switch (paginateDto.studentPaymentType) {
        case 'SESSION':
          queryBuilder.andWhere(
            'studentPaymentStrategy.includeSession = :includeSession',
            {
              includeSession: true,
            },
          );
          break;
        case 'MONTHLY':
          queryBuilder.andWhere(
            'studentPaymentStrategy.includeMonth = :includeMonth',
            {
              includeMonth: true,
            },
          );
          break;
        case 'CLASS':
          queryBuilder.andWhere(
            'studentPaymentStrategy.includeClass = :includeClass',
            {
              includeClass: true,
            },
          );
          break;
      }
    }

    return this.paginate(
      paginateDto,
      SESSION_PAGINATION_COLUMNS,
      '/sessions',
      queryBuilder,
    );
  }

  async findByGroupId(
    groupId: string,
    options?: {
      status?: SessionStatus;
      startTimeFrom?: Date;
      startTimeTo?: Date;
    },
    relations?: string[],
  ): Promise<Session[]> {
    return this.findSessions(
      {
        groupId,
        status: options?.status,
        startTimeFrom: options?.startTimeFrom,
        startTimeTo: options?.startTimeTo,
      },
      relations,
    );
  }

  async findOverlappingSessions(
    teacherUserProfileId: string,
    startTime: Date,
    endTime: Date,
    excludeSessionId?: string,
    relations?: string[],
  ): Promise<Session[]> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      .where('session.teacherUserProfileId = :teacherUserProfileId', {
        teacherUserProfileId,
      })
      .andWhere(
        '(session.startTime < :endTime AND session.endTime > :startTime)',
        { startTime, endTime },
      );

    if (excludeSessionId) {
      queryBuilder.andWhere('session.id != :excludeSessionId', {
        excludeSessionId,
      });
    }

    // Load relations if specified
    if (relations && relations.length > 0) {
      for (const relation of relations) {
        queryBuilder.leftJoinAndSelect(`session.${relation}`, relation);
      }
    }

    return queryBuilder.getMany();
  }

  /**
   * Find a session by groupId and exact startTime
   * Used for materialization logic to check if a session already exists
   * Must match exactly for merge integrity with virtual sessions
   *
   * @param groupId - Group ID
   * @param startTime - Session start time (should have milliseconds stripped)
   * @returns Session if found, null otherwise
   */
  async findByGroupIdAndStartTime(
    groupId: string,
    startTime: Date,
  ): Promise<Session | null> {
    return this.getRepository().findOne({
      where: {
        groupId,
        startTime,
      },
    });
  }

  /**
   * Find existing session within a time window
   * Optimized check to see if a session already exists before searching for schedule items
   * This short-circuits expensive schedule item queries when a session already exists
   *
   * @param groupId - Group ID
   * @param now - Current UTC time
   * @param windowMinutes - Time window in minutes (default: 30 minutes before, 5 minutes after)
   * @returns Session if found within window, null otherwise
   */
  async findExistingSessionInTimeWindow(
    groupId: string,
    now: Date,
    windowMinutes: number = 30,
  ): Promise<Session | null> {
    return this.getRepository()
      .createQueryBuilder('session')
      .where('session.groupId = :groupId', { groupId })
      .andWhere('session.startTime >= :windowStart', {
        windowStart: new Date(now.getTime() - windowMinutes * 60 * 1000),
      })
      .andWhere('session.startTime <= :windowEnd', {
        windowEnd: new Date(now.getTime() + 5 * 60 * 1000), // 5 minute buffer for just-started sessions
      })
      .andWhere('session.status != :canceledStatus', {
        canceledStatus: SessionStatus.CANCELED,
      })
      .orderBy('session.startTime', 'ASC')
      .limit(1)
      .getOne();
  }

  /**
   * Find matching schedule item for startSession operation
   * Optimized database query that directly matches schedule items to current time
   * and checks if session already exists - all in one query
   *
   * Edge Cases Handled:
   * - DST Transitions: Uses explicit ::date cast to ensure correct day identification in center timezone
   * - Overlapping Schedule Items: ORDER BY ensures earliest matching session is selected
   * - Midnight Boundary Shift: DOW extraction is done AFTER converting to center timezone
   * - Concurrency: Unique constraint on (groupId, startTime) prevents duplicate sessions
   *
   * @param groupId - Group ID
   * @param now - Current UTC time
   * @returns Matching schedule item with calculated times and existing session info, or null
   */
  async findMatchingScheduleItemForStartSession(
    groupId: string,
    now: Date,
  ): Promise<{
    scheduleItemId: string;
    calculatedStartTime: Date;
    calculatedEndTime: Date;
    existingSessionId?: string;
    existingSessionStatus?: SessionStatus;
  } | null> {
    const manager = this.getRepository().manager;
    const result = (await manager.query(
      `
      -- CTE: Calculate session times once, reference everywhere
      -- This eliminates code duplication and prevents copy-paste errors
      WITH schedule_calculations AS (
        SELECT 
          si.id,
          si."groupId",
          si.day,
          -- DST-safe time calculation:
          -- 1. Convert UTC timestamp to center timezone
          -- 2. Extract date (day) in center timezone (explicit ::date cast handles DST)
          -- 3. Add time component (startTime is stored as "HH:mm", concatenate ':00' for seconds)
          -- 4. Convert back to UTC
          (
            (DATE_TRUNC('day', $1 AT TIME ZONE center.timezone)::date + 
             (si."startTime" || ':00')::TIME) AT TIME ZONE center.timezone
          ) AS calculated_start_time,
          -- Calculate end time: start time + class duration
          (
            (DATE_TRUNC('day', $1 AT TIME ZONE center.timezone)::date + 
             (si."startTime" || ':00')::TIME + 
             (c.duration || ' minutes')::INTERVAL) AT TIME ZONE center.timezone
          ) AS calculated_end_time
        FROM schedule_items si
        INNER JOIN groups g ON si."groupId" = g.id
        INNER JOIN classes c ON si."classId" = c.id
        INNER JOIN centers center ON c."centerId" = center.id
        WHERE si."groupId" = $2
          -- Midnight boundary shift protection: Extract DOW AFTER converting to center timezone
          AND EXTRACT(DOW FROM $1 AT TIME ZONE center.timezone) = (
            CASE si.day
              WHEN 'Mon' THEN 1
              WHEN 'Tue' THEN 2
              WHEN 'Wed' THEN 3
              WHEN 'Thu' THEN 4
              WHEN 'Fri' THEN 5
              WHEN 'Sat' THEN 6
              WHEN 'Sun' THEN 0
            END
          )
          -- Class must be active and within date range
          AND c."startDate" <= $1
          AND (c."endDate" IS NULL OR c."endDate" >= $1)
      )
      SELECT 
        sc.id as "scheduleItemId",
        sc.calculated_start_time AS "calculatedStartTime",
        sc.calculated_end_time AS "calculatedEndTime",
        s.id as "existingSessionId",
        s.status as "existingSessionStatus"
      FROM schedule_calculations sc
      -- Check if session already exists (concurrency protection via unique constraint)
      LEFT JOIN sessions s ON s."groupId" = sc."groupId" 
        AND s."startTime" = sc.calculated_start_time
      WHERE $1 >= (sc.calculated_start_time - INTERVAL '30 minutes')
        -- Overlapping schedule items: ORDER BY ensures earliest matching session is selected
      ORDER BY sc.calculated_start_time ASC
      LIMIT 1
      `,
      [now, groupId],
    )) as Array<{
      scheduleItemId: string;
      calculatedStartTime: string | Date;
      calculatedEndTime: string | Date;
      existingSessionId?: string | null;
      existingSessionStatus?: SessionStatus | null;
    }>;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      scheduleItemId: row.scheduleItemId,
      calculatedStartTime: new Date(row.calculatedStartTime),
      calculatedEndTime: new Date(row.calculatedEndTime),
      existingSessionId: row.existingSessionId || undefined,
      existingSessionStatus: row.existingSessionStatus || undefined,
    };
  }

  /**
   * Find matching schedule item for cancelSession operation
   * Validates that scheduledStartTime matches a schedule item and checks if session exists
   *
   * Edge Cases Handled:
   * - DST Transitions: Uses explicit ::date cast to ensure correct day identification in center timezone
   * - Time Matching: Uses 1-second tolerance to account for millisecond normalization
   * - Midnight Boundary Shift: DOW extraction is done AFTER converting to center timezone
   * - Concurrency: Unique constraint on (groupId, startTime) prevents duplicate sessions
   *
   * @param groupId - Group ID
   * @param scheduledStartTime - Scheduled start time (UTC Date)
   * @returns Matching schedule item with calculated times and existing session info, or null
   */
  async findMatchingScheduleItemForCancelSession(
    groupId: string,
    scheduledStartTime: Date,
  ): Promise<{
    scheduleItemId: string;
    calculatedStartTime: Date;
    calculatedEndTime: Date;
    existingSessionId?: string;
    existingSessionStatus?: SessionStatus;
  } | null> {
    const manager = this.getRepository().manager;
    const result = (await manager.query(
      `
      -- CTE: Calculate session times once, reference everywhere
      -- This eliminates code duplication and prevents copy-paste errors
      WITH schedule_calculations AS (
        SELECT 
          si.id,
          si."groupId",
          si.day,
          -- DST-safe time calculation:
          -- 1. Convert UTC timestamp to center timezone
          -- 2. Extract date (day) in center timezone (explicit ::date cast handles DST)
          -- 3. Add time component (startTime is stored as "HH:mm", concatenate ':00' for seconds)
          -- 4. Convert back to UTC
          (
            (DATE_TRUNC('day', $1 AT TIME ZONE center.timezone)::date + 
             (si."startTime" || ':00')::TIME) AT TIME ZONE center.timezone
          ) AS calculated_start_time,
          -- Calculate end time: start time + class duration
          (
            (DATE_TRUNC('day', $1 AT TIME ZONE center.timezone)::date + 
             (si."startTime" || ':00')::TIME + 
             (c.duration || ' minutes')::INTERVAL) AT TIME ZONE center.timezone
          ) AS calculated_end_time
        FROM schedule_items si
        INNER JOIN groups g ON si."groupId" = g.id
        INNER JOIN classes c ON si."classId" = c.id
        INNER JOIN centers center ON c."centerId" = center.id
        WHERE si."groupId" = $2
          -- Midnight boundary shift protection: Extract DOW AFTER converting to center timezone
          AND EXTRACT(DOW FROM $1 AT TIME ZONE center.timezone) = (
            CASE si.day
              WHEN 'Mon' THEN 1
              WHEN 'Tue' THEN 2
              WHEN 'Wed' THEN 3
              WHEN 'Thu' THEN 4
              WHEN 'Fri' THEN 5
              WHEN 'Sat' THEN 6
              WHEN 'Sun' THEN 0
            END
          )
      )
      SELECT 
        sc.id as "scheduleItemId",
        sc.calculated_start_time AS "calculatedStartTime",
        sc.calculated_end_time AS "calculatedEndTime",
        s.id as "existingSessionId",
        s.status as "existingSessionStatus"
      FROM schedule_calculations sc
      -- Check if session already exists (concurrency protection via unique constraint)
      LEFT JOIN sessions s ON s."groupId" = sc."groupId" 
        AND s."startTime" = sc.calculated_start_time
      WHERE 
        -- Time matching with 1-second tolerance (accounts for millisecond normalization)
        ABS(EXTRACT(EPOCH FROM (sc.calculated_start_time - $1))) < 1
      LIMIT 1
      `,
      [scheduledStartTime, groupId],
    )) as Array<{
      scheduleItemId: string;
      calculatedStartTime: string | Date;
      calculatedEndTime: string | Date;
      existingSessionId?: string | null;
      existingSessionStatus?: SessionStatus | null;
    }>;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      scheduleItemId: row.scheduleItemId,
      calculatedStartTime: new Date(row.calculatedStartTime),
      calculatedEndTime: new Date(row.calculatedEndTime),
      existingSessionId: row.existingSessionId || undefined,
      existingSessionStatus: row.existingSessionStatus || undefined,
    };
  }

  async getUnmarkedStudentCount(
    sessionId: string,
    groupId: string,
  ): Promise<number> {
    const result = await this.getEntityManager().query<
      Array<{ unmarkedCount: number }>
    >(
      `
      SELECT COUNT(*)::int as "unmarkedCount"
      FROM "group_students" gs
      WHERE gs."groupId" = $1::uuid
        AND gs."leftAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "attendance" a
          WHERE a."sessionId" = $2::uuid
            AND a."studentUserProfileId" = gs."studentUserProfileId"
        )
      `,
      [groupId, sessionId],
    );

    return Number(result[0]?.unmarkedCount || 0);
  }

  async getTotalStudentsInGroup(groupId: string): Promise<number> {
    const result = await this.getEntityManager().query<
      Array<{ totalStudents: number }>
    >(
      `
      SELECT COUNT(*)::int as "totalStudents"
      FROM "group_students" gs
      WHERE gs."groupId" = $1::uuid
        AND gs."leftAt" IS NULL
      `,
      [groupId],
    );

    return Number(result[0]?.totalStudents || 0);
  }

  async countActiveTeachersForCenter(centerId: string): Promise<number> {
    // Count distinct teachers assigned to classes that have sessions in the current month
    const currentMonth = new Date();
    currentMonth.setDate(1); // Start of current month
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const result = await this.getRepository()
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.teacherUserProfileId)', 'count')
      .leftJoin('session.class', 'class')
      .where('class.centerId = :centerId', { centerId })
      .andWhere('session.startTime >= :startOfMonth', { startOfMonth: currentMonth })
      .andWhere('session.startTime < :startOfNextMonth', { startOfNextMonth: nextMonth })
      .andWhere('session.status IN (:...statuses)', { statuses: ['COMPLETED', 'IN_PROGRESS', 'SCHEDULED'] })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async countActiveStudentsForCenter(centerId: string): Promise<number> {
    // Count distinct students enrolled in groups that have classes with sessions in the current month
    const currentMonth = new Date();
    currentMonth.setDate(1); // Start of current month
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const result = await this.getEntityManager().query<
      Array<{ count: number }>
    >(
      `
      SELECT COUNT(DISTINCT gs."studentUserProfileId")::int as count
      FROM group_students gs
      INNER JOIN groups g ON gs."groupId" = g.id
      INNER JOIN classes c ON g."classId" = c.id
      WHERE c."centerId" = $1::uuid
        AND gs."leftAt" IS NULL
        AND EXISTS (
          SELECT 1 FROM sessions s
          WHERE s."classId" = c.id
            AND s."startTime" >= $2
            AND s."startTime" < $3
            AND s.status IN ('COMPLETED', 'IN_PROGRESS', 'SCHEDULED')
        )
      `,
      [centerId, currentMonth, nextMonth],
    );

    return Number(result[0]?.count || 0);
  }
}
