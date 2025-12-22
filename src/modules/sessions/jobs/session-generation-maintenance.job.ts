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
  async handleCron() {
    this.logger.log('Starting session generation maintenance job');

    try {
      const now = new Date();
      const fourWeeksFromNow = new Date(now);
      fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28); // 4 weeks = 28 days

      // Set-based query to find groups that need more sessions
      // Uses GROUP BY and HAVING to identify groups with fewer than required sessions
      // Required sessions = scheduleItemsCount * 4 (4 weeks ahead)
      const groupsNeedingSessions = await this.dataSource
        .getRepository(Group)
        .createQueryBuilder('group')
        .leftJoin('group.class', 'class')
        .leftJoin('group.scheduleItems', 'scheduleItem')
        .leftJoin(
          Session,
          'session',
          'session."groupId" = group.id AND session."startTime" > :now AND session."startTime" <= :fourWeeksFromNow AND session.status = :scheduledStatus',
          { now, fourWeeksFromNow, scheduledStatus: SessionStatus.SCHEDULED },
        )
        .where('group.deletedAt IS NULL')
        .andWhere('class.status != :canceled', {
          canceled: ClassStatus.CANCELED,
        })
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

      this.logger.log(
        `Found ${groupsNeedingSessions.length} groups needing sessions`,
      );

      let processedCount = 0;
      let generatedCount = 0;

      for (const groupData of groupsNeedingSessions) {
        try {
          const groupId = String(groupData.groupId);
          const centerId = String(groupData.centerId);
          const scheduleItemsCount = parseInt(
            String(groupData.scheduleItemsCount || '0'),
            10,
          );
          const futureSessionCount = parseInt(
            String(groupData.futureSessionCount || '0'),
            10,
          );

          if (scheduleItemsCount === 0) {
            // Skip groups with no schedule items
            continue;
          }

          // Generate buffer sessions
          const systemActor = createSystemActor(centerId);

          await this.sessionGenerationService.generateBufferSessionsForGroup(
            groupId,
            systemActor,
          );

          generatedCount++;
          this.logger.debug(
            `Generated buffer sessions for group ${groupId} (had ${futureSessionCount}, needs ${scheduleItemsCount * 4})`,
          );

          processedCount++;
        } catch (error) {
          const groupId = String(groupData.groupId || 'unknown');
          this.logger.error(
            `Error processing group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
            error,
          );
          // Continue with next group
        }
      }

      this.logger.log(
        `Session generation maintenance completed. Processed: ${processedCount}, Generated: ${generatedCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Session generation maintenance job failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }
}
