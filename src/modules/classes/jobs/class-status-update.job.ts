import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In, IsNull } from 'typeorm';
import { Class } from '../entities/class.entity';
import { ClassStatus } from '../enums/class-status.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { ClassStatusChangedEvent } from '../events/class.events';
import { createSystemActor } from '@/shared/common/utils/system-actor.util';
import { RequestContext } from '@/shared/common/context/request.context';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { Locale } from '@/shared/common/enums/locale.enum';
import { Center } from '@/modules/centers/entities/center.entity';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { DEFAULT_TIMEZONE } from '@/shared/common/constants/timezone.constants';

/**
 * Cronjob to automatically update class statuses based on startDate and endDate
 * Runs hourly to check for classes that need status transitions
 */
@Injectable()
export class ClassStatusUpdateJob {
  private readonly logger = new Logger(ClassStatusUpdateJob.name);

  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  /**
   * Automatically update class statuses based on dates
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateClassStatuses(): Promise<void> {
    this.logger.log('Starting automatic class status update');

    // Create RequestContext with system user ID so BaseEntity hooks can populate createdBy/updatedBy
    // RequestContext.run() creates a new async context that persists for all async operations including event listeners
    await RequestContext.run(
      {
        userId: SYSTEM_USER_ID,
        locale: Locale.EN,
      },
      async () => {
        await this.executeStatusUpdates();
      },
    );
  }

  /**
   * Main status update logic - Elite Precision implementation
   * Processes each center separately based on its timezone to ensure
   * status transitions happen at the center's local midnight, not UTC midnight
   */
  private async executeStatusUpdates(): Promise<void> {
    // eslint-disable-next-line no-restricted-globals
    const startTime = Date.now(); // Performance timing - returns number, not Date object

    try {
      // Fetch all active centers with their timezones
      const centers = await this.centerRepository.find({
        where: { isActive: true },
        select: ['id', 'timezone'],
      });

      if (centers.length === 0) {
        this.logger.log('No active centers found, skipping status update');
        return;
      }

      let totalActivatedCount = 0;
      let totalFinishedCount = 0;

      // Process each center separately with its timezone
      for (const center of centers) {
        const timezone = center.timezone || DEFAULT_TIMEZONE;

        // Get current moment in center's timezone (already returns UTC Date)
        const centerNowUtc = TimezoneService.getZonedNow(timezone);

        // 1. Activate Classes (NOT_STARTED -> ACTIVE)
        const classesToActivate = await this.classRepository.find({
          where: {
            centerId: center.id,
            status: ClassStatus.NOT_STARTED,
            startDate: LessThanOrEqual(centerNowUtc), // Comparing UTC to UTC
            deletedAt: IsNull(),
          },
        });

        // 2. Finish Classes (ACTIVE/PAUSED -> FINISHED)
        const classesToFinish = await this.classRepository
          .createQueryBuilder('class')
          .where('class.centerId = :centerId', { centerId: center.id })
          .andWhere('class.status IN (:...statuses)', {
            statuses: [ClassStatus.ACTIVE, ClassStatus.PAUSED],
          })
          .andWhere('class.endDate IS NOT NULL')
          .andWhere('class.endDate <= :centerNowUtc', { centerNowUtc })
          .andWhere('class.deletedAt IS NULL')
          .getMany();

        // Activate classes that should start
        if (classesToActivate.length > 0) {
          const classIds = classesToActivate.map((c) => c.id);
          await this.classRepository.update(
            { id: In(classIds) },
            { status: ClassStatus.ACTIVE },
          );

          // Emit events for each activated class
          for (const classEntity of classesToActivate) {
            const systemActor = createSystemActor(classEntity.centerId);

            const event = new ClassStatusChangedEvent(
              classEntity.id,
              ClassStatus.NOT_STARTED,
              ClassStatus.ACTIVE,
              'Automatic status update: startDate reached',
              systemActor,
              classEntity.centerId,
            );
            await this.typeSafeEventEmitter.emitAsync(
              ClassEvents.STATUS_CHANGED,
              event as any,
            );
          }

          totalActivatedCount += classesToActivate.length;
        }

        // Finish classes that should end
        if (classesToFinish.length > 0) {
          const classIds = classesToFinish.map((c) => c.id);
          await this.classRepository.update(
            { id: In(classIds) },
            { status: ClassStatus.FINISHED },
          );

          // Emit events for each finished class
          for (const classEntity of classesToFinish) {
            const systemActor = createSystemActor(classEntity.centerId);

            const event = new ClassStatusChangedEvent(
              classEntity.id,
              classEntity.status,
              ClassStatus.FINISHED,
              'Automatic status update: endDate reached',
              systemActor,
              classEntity.centerId,
            );
            await this.typeSafeEventEmitter.emitAsync(
              ClassEvents.STATUS_CHANGED,
              event as any,
            );
          }

          totalFinishedCount += classesToFinish.length;
        }
      }

      // eslint-disable-next-line no-restricted-globals
      const duration = Date.now() - startTime; // Performance timing - returns number, not Date object

      if (totalActivatedCount > 0 || totalFinishedCount > 0) {
        this.logger.log('Class status update completed (Elite Precision)', {
          activatedCount: totalActivatedCount,
          finishedCount: totalFinishedCount,
          centersProcessed: centers.length,
          duration,
          timestamp: TimezoneService.getZonedNow().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        'Error during automatic class status update',
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Re-throw to ensure cron framework knows it failed
    }
  }
}
