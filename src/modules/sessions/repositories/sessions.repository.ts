import { Injectable } from '@nestjs/common';
import { Session } from '../entities/session.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { SessionStatus } from '../enums/session-status.enum';
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { SessionFiltersDto } from '../dto/session-filters.dto';
import { CalendarSessionsDto } from '../dto/calendar-sessions.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { SelectQueryBuilder } from 'typeorm';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { subHours } from 'date-fns';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

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
      status?: SessionStatus;
      startTimeFrom?: Date;
      startTimeTo?: Date;
      startTimeAfter?: Date; // For future sessions
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
   * Build a query builder with shared session filters
   * Used by both pagination and calendar endpoints
   *
   * @param filters - Filter parameters
   * @param actor - The user performing the action
   * @returns Query builder with filters applied
   */
  private async buildSessionQueryBuilder(
    filters: SessionFiltersDto,
    actor: ActorUser,
  ): Promise<SelectQueryBuilder<Session>> {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      // Join relations for filtering
      .leftJoin('session.group', 'group')
      .leftJoin('group.class', 'class')
      // Select only needed fields from relations
      .addSelect(['group.id', 'group.name', 'class.id', 'class.name'])
      // Filter by center through group
      .where('group.centerId = :centerId', { centerId });

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
    }

    // Apply filters
    if (filters.groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', {
        groupId: filters.groupId,
      });
    }

    if (filters.classId) {
      queryBuilder.andWhere('group.classId = :classId', {
        classId: filters.classId,
      });
    }

    if (filters.status !== undefined && filters.status !== null) {
      queryBuilder.andWhere('session.status = :status', {
        status: filters.status,
      });
    }

    // Handle dateFrom/dateTo with timezone-aware conversion
    // If date strings are provided (YYYY-MM-DD), convert to UTC range based on center timezone
    const filtersWithDates = filters as SessionFiltersDto & {
      dateFrom?: string;
      dateTo?: string;
    };

    if (filtersWithDates.dateFrom || filtersWithDates.dateTo) {
      const timezone = TimezoneService.getTimezoneFromContext();

      if (filtersWithDates.dateFrom && filtersWithDates.dateTo) {
        // Both dates provided - use range conversion
        const { start, end } = TimezoneService.getZonedDateRange(
          filtersWithDates.dateFrom,
          filtersWithDates.dateTo,
          timezone,
        );
        // Use >= for start (inclusive) and < for end (exclusive)
        queryBuilder.andWhere('session.startTime >= :dateFrom', {
          dateFrom: start,
        });
        queryBuilder.andWhere('session.startTime < :dateTo', {
          dateTo: end,
        });
      } else if (filtersWithDates.dateFrom) {
        // Only dateFrom provided - convert to UTC midnight in center timezone
        const dateFrom = TimezoneService.dateOnlyToUtc(
          filtersWithDates.dateFrom,
          timezone,
        );
        queryBuilder.andWhere('session.startTime >= :dateFrom', {
          dateFrom,
        });
      } else if (filtersWithDates.dateTo) {
        // Only dateTo provided - convert to UTC range (midnight to next midnight)
        const dateToRange = TimezoneService.dateRangeToUtc(
          filtersWithDates.dateTo,
          timezone,
        );
        // Use < for end (exclusive) to include all sessions on dateTo
        queryBuilder.andWhere('session.startTime < :dateTo', {
          dateTo: dateToRange.end,
        });
      }
    }

    return queryBuilder;
  }

  /**
   * Paginate sessions with filtering and search capabilities.
   *
   * @param paginateDto - Pagination and filter parameters
   * @param actor - The user performing the action
   * @returns Paginated list of sessions
   */
  async paginateSessions(
    paginateDto: PaginateSessionsDto,
    actor: ActorUser,
  ): Promise<Pagination<Session>> {
    const queryBuilder = await this.buildSessionQueryBuilder(
      paginateDto,
      actor,
    );

    return this.paginate(
      paginateDto,
      {
        searchableColumns: ['title'],
        sortableColumns: ['startTime', 'endTime', 'createdAt', 'updatedAt'],
        defaultSortBy: ['startTime', 'ASC'],
      },
      '/sessions',
      queryBuilder,
    );
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
      // Join and select relations needed for calendar display
      .leftJoinAndSelect('session.group', 'group')
      .leftJoinAndSelect('group.class', 'class')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      // Filter by center through group
      .where('group.centerId = :centerId', { centerId });

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
    }

    // Apply date range filter with timezone-aware conversion
    // dateFrom and dateTo are date strings (YYYY-MM-DD) interpreted in center timezone
    const timezone = TimezoneService.getTimezoneFromContext();
    const { start, end } = TimezoneService.getZonedDateRange(
      dto.dateFrom,
      dto.dateTo,
      timezone,
    );
    // Use >= for start (inclusive) and < for end (exclusive)
    queryBuilder
      .andWhere('session.startTime >= :dateFrom', { dateFrom: start })
      .andWhere('session.startTime < :dateTo', { dateTo: end });

    // Apply other filters
    if (dto.groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', {
        groupId: dto.groupId,
      });
    }

    if (dto.classId) {
      queryBuilder.andWhere('group.classId = :classId', {
        classId: dto.classId,
      });
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
   * Count total sessions in date range for calendar
   *
   * @param dto - Calendar sessions DTO with filters and date range
   * @param actor - The user performing the action
   * @returns Total count of sessions
   */
  async countCalendarSessions(
    dto: CalendarSessionsDto,
    actor: ActorUser,
  ): Promise<number> {
    const queryBuilder = await this.buildSessionQueryBuilder(dto, actor);

    // Apply date range filter with timezone-aware conversion
    const timezone = TimezoneService.getTimezoneFromContext();
    const { start, end } = TimezoneService.getZonedDateRange(
      dto.dateFrom,
      dto.dateTo,
      timezone,
    );
    // Use >= for start (inclusive) and < for end (exclusive)
    queryBuilder
      .andWhere('session.startTime >= :dateFrom', { dateFrom: start })
      .andWhere('session.startTime < :dateTo', { dateTo: end });

    return queryBuilder.getCount();
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

  async findFutureScheduledSessionsByScheduleItem(
    scheduleItemId: string,
    relations?: string[],
  ): Promise<Session[]> {
    const now = TimezoneService.getZonedNowFromContext();
    return this.findSessions(
      {
        scheduleItemId,
        status: SessionStatus.SCHEDULED,
        startTimeAfter: now,
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
      .leftJoin('session.group', 'group')
      .leftJoin('group.class', 'class')
      .where('class.teacherUserProfileId = :teacherUserProfileId', {
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

  async findSessionsByGroupAndDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date,
    relations?: string[],
  ): Promise<Session[]> {
    return this.findSessions(
      {
        groupId,
        startTimeFrom: startDate,
        startTimeTo: endDate,
      },
      relations,
    );
  }

  async findFutureScheduledSessionsByGroup(
    groupId: string,
    relations?: string[],
  ): Promise<Session[]> {
    const now = TimezoneService.getZonedNowFromContext();
    return this.findSessions(
      {
        groupId,
        status: SessionStatus.SCHEDULED,
        startTimeAfter: now,
      },
      relations,
    );
  }

  async countFutureSessionsByGroup(groupId: string): Promise<number> {
    const now = TimezoneService.getZonedNowFromContext();
    return this.getRepository()
      .createQueryBuilder('session')
      .where('session.groupId = :groupId', { groupId })
      .andWhere('session.startTime > :now', { now })
      .getCount();
  }

  async deleteFutureScheduledSessionsByGroup(groupId: string): Promise<void> {
    const now = TimezoneService.getZonedNowFromContext();
    await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(Session)
      .where('groupId = :groupId', { groupId })
      .andWhere('status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere('startTime > :now', { now })
      .execute();
  }

  /**
   * Delete SCHEDULED sessions for hard-locked classes (CANCELED/FINISHED for >24 hours)
   * Uses efficient subquery to filter at database level, avoiding memory loading
   * Preserves FINISHED, CONDUCTING, and CANCELED sessions for historical records
   * @returns Count of deleted sessions
   */
  async deleteScheduledSessionsForHardLockedClasses(): Promise<number> {
    const now = TimezoneService.getZonedNowFromContext();
    const twentyFourHoursAgo = subHours(now, 24);

    const deleteResult = await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(Session)
      .where('status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere(
        `groupId IN (
          SELECT g.id FROM groups g
          INNER JOIN classes c ON g."classId" = c.id
          WHERE c.status IN ('CANCELED', 'FINISHED')
          AND c."updatedAt" < :twentyFourHoursAgo
        )`,
        { twentyFourHoursAgo },
      )
      .execute();

    return deleteResult.affected || 0;
  }

  /**
   * Get a QueryBuilder for future scheduled sessions
   * Allows service layer to chain additional filters
   * @param groupId - Optional group ID filter
   * @param scheduleItemId - Optional schedule item ID filter
   * @param relations - Optional relations to load
   * @returns QueryBuilder instance ready for chaining
   */
  getFutureScheduledQuery(
    groupId?: string,
    scheduleItemId?: string,
    relations?: string[],
  ): SelectQueryBuilder<Session> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      .where('session.status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere('session.startTime > :now', {
        now: TimezoneService.getZonedNowFromContext(),
      });

    if (groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', { groupId });
    }

    if (scheduleItemId) {
      queryBuilder.andWhere('session.scheduleItemId = :scheduleItemId', {
        scheduleItemId,
      });
    }

    if (relations && relations.length > 0) {
      for (const relation of relations) {
        queryBuilder.leftJoinAndSelect(`session.${relation}`, relation);
      }
    }

    return queryBuilder.orderBy('session.startTime', 'ASC');
  }

  /**
   * Get a QueryBuilder for overlapping sessions
   * @param startTime - Session start time
   * @param endTime - Session end time
   * @param groupId - Optional group ID (for group-level conflicts)
   * @param teacherUserProfileId - Optional teacher ID (for teacher-level conflicts)
   * @param excludeSessionId - Optional session ID to exclude
   * @returns QueryBuilder instance ready for chaining
   */
  getOverlappingQuery(
    startTime: Date,
    endTime: Date,
    groupId?: string,
    teacherUserProfileId?: string,
    excludeSessionId?: string,
  ): SelectQueryBuilder<Session> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('session')
      .where('session.startTime < :endTime', { endTime })
      .andWhere('session.endTime > :startTime', { startTime });

    if (groupId) {
      queryBuilder.andWhere('session.groupId = :groupId', { groupId });
    }

    if (teacherUserProfileId) {
      queryBuilder
        .leftJoin('session.group', 'group')
        .leftJoin('group.class', 'class')
        .andWhere('class.teacherUserProfileId = :teacherUserProfileId', {
          teacherUserProfileId,
        });
    }

    if (excludeSessionId) {
      queryBuilder.andWhere('session.id != :excludeSessionId', {
        excludeSessionId,
      });
    }

    return queryBuilder;
  }
}
