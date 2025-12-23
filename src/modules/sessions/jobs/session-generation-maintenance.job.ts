import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionGenerationService } from '../services/session-generation.service';
import { SessionsRepository } from '../repositories/sessions.repository';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Group } from '@/modules/classes/entities/group.entity';
import { Session } from '../entities/session.entity';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import { SessionStatus } from '../enums/session-status.enum';
import { createSystemActor } from '@/shared/common/utils/system-actor.util';
import { RequestContext } from '@/shared/common/context/request.context';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { Locale } from '@/shared/common/enums/locale.enum';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { addDays } from 'date-fns';

/**
 * Weekly cronjob to maintain 4-week buffer of future sessions
 * Runs every week to ensure groups have at least 4 weeks of future sessions
 */
@Injectable()
export class SessionGenerationMaintenanceJob {
  private readonly logger = new Logger(SessionGenerationMaintenanceJob.name);

  constructor(
    private readonly sessionGenerationService: SessionGenerationService,
    private readonly sessionsRepository: SessionsRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleCron(): Promise<void> {
    this.logger.log('Starting session generation maintenance job');

    // Create RequestContext with system user ID so BaseEntity hooks can populate createdBy/updatedBy
    // RequestContext.run() creates a new async context that persists for all async operations including event listeners
    await RequestContext.run(
      {
        userId: SYSTEM_USER_ID,
        locale: Locale.EN,
      },
      async () => {
        await this.executeMaintenance();
      },
    );
  }

  /**
   * Main maintenance logic - extracted for testability and clarity
   */
  private async executeMaintenance(): Promise<void> {
    try {
      // Use default timezone for maintenance job (processes all centers)
      // Individual session generation will use each center's timezone
      const now = TimezoneService.getZonedNowFromContext();
      const fourWeeksFromNow = addDays(now, 28); // 4 weeks = 28 days

      const groupsNeedingSessions = await this.findGroupsNeedingSessions(
        now,
        fourWeeksFromNow,
            );

      this.logger.log(
        `Found ${groupsNeedingSessions.length} groups needing sessions`,
            );

      const { processedCount, generatedCount } = await this.processGroups(
        groupsNeedingSessions,
          );

      this.logger.log(
        `Session generation maintenance completed. Processed: ${processedCount}, Generated: ${generatedCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Session generation maintenance job failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
      throw error; // Re-throw to ensure cron framework knows it failed
    }
  }

  /**
   * Find groups that need more sessions using set-based query
   * Uses GROUP BY and HAVING to identify groups with fewer than required sessions
   * Required sessions = scheduleItemsCount * 4 (4 weeks ahead)
   */
  private async findGroupsNeedingSessions(
    now: Date,
    fourWeeksFromNow: Date,
  ): Promise<
    Array<{
      groupId: string;
      centerId: string;
      scheduleItemsCount: number;
      futureSessionCount: number;
    }>
  > {
    const rawResults = await this.dataSource
      .getRepository(Group)
      .createQueryBuilder('group')
      .leftJoin('group.class', 'class')
      .leftJoin('group.scheduleItems', 'scheduleItem')
      .leftJoin(
        Session,
        'session',
        'session."groupId" = group.id AND session."startTime" > :now AND session."startTime" <= :fourWeeksFromNow AND session.status = :scheduledStatus',
        {
          now,
          fourWeeksFromNow,
          scheduledStatus: SessionStatus.SCHEDULED,
        },
      )
      .where('group.deletedAt IS NULL')
      .andWhere('class.status != :canceled', { canceled: ClassStatus.CANCELED })
      .andWhere('class.status != :finished', {
        finished: ClassStatus.FINISHED,
      })
      .select('group.id', 'groupId')
      .addSelect('group.centerId', 'centerId')
      .addSelect('COUNT(DISTINCT scheduleItem.id)', 'scheduleItemsCount')
      .addSelect('COUNT(DISTINCT session.id)', 'futureSessionCount')
      .groupBy('group.id')
      .addGroupBy('group.centerId')
      .having(
        'COUNT(DISTINCT session.id) < COUNT(DISTINCT scheduleItem.id) * 4',
      )
      .getRawMany();

    // Transform and filter results
    return rawResults
      .map(
        (row: {
          groupId: unknown;
          centerId: unknown;
          scheduleItemsCount: unknown;
          futureSessionCount: unknown;
        }) => {
          const scheduleItemsCount =
            typeof row.scheduleItemsCount === 'number'
              ? row.scheduleItemsCount
              : typeof row.scheduleItemsCount === 'string'
                ? parseInt(row.scheduleItemsCount, 10)
                : 0;
          const futureSessionCount =
            typeof row.futureSessionCount === 'number'
              ? row.futureSessionCount
              : typeof row.futureSessionCount === 'string'
                ? parseInt(row.futureSessionCount, 10)
                : 0;

          return {
            groupId: String(row.groupId),
            centerId: String(row.centerId),
            scheduleItemsCount,
            futureSessionCount,
          };
        },
      )
      .filter((group) => group.scheduleItemsCount > 0);
  }

  /**
   * Process groups and generate buffer sessions
   * Returns counts of processed and generated groups
   */
  private async processGroups(
    groups: Array<{
      groupId: string;
      centerId: string;
      scheduleItemsCount: number;
      futureSessionCount: number;
    }>,
  ): Promise<{ processedCount: number; generatedCount: number }> {
    let processedCount = 0;
    let generatedCount = 0;

    for (const group of groups) {
      try {
        const systemActor = createSystemActor(group.centerId);

        await this.sessionGenerationService.generateBufferSessionsForGroup(
          group.groupId,
          systemActor,
        );

        generatedCount++;
        this.logger.debug(
          `Generated buffer sessions for group ${group.groupId} (had ${group.futureSessionCount}, needs ${group.scheduleItemsCount * 4})`,
        );
        processedCount++;
      } catch (error) {
        this.logger.error(
          `Error processing group ${group.groupId}: ${error instanceof Error ? error.message : String(error)}`,
          error,
        );
        // Continue with next group - don't increment processedCount on failure
      }
    }

    return { processedCount, generatedCount };
  }
}
