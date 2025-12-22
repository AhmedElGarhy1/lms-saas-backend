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
   * Main status update logic - extracted for testability and clarity
   */
  private async executeStatusUpdates(): Promise<void> {
    const startTime = Date.now();
    const now = new Date();

    try {
      // Find classes with status NOT_STARTED where startDate <= now() → set to ACTIVE
      // Note: Classes in PENDING_TEACHER_APPROVAL will not auto-transition (requires manual approval)
      const classesToActivate = await this.classRepository.find({
        where: {
          status: ClassStatus.NOT_STARTED,
          startDate: LessThanOrEqual(now),
          deletedAt: IsNull(), // Only process non-deleted classes
        },
      });

      // Find classes with status ACTIVE or PAUSED where endDate IS NOT NULL AND endDate < now() → set to FINISHED
      const classesToFinish = await this.classRepository
        .createQueryBuilder('class')
        .where('class.status IN (:...statuses)', {
          statuses: [ClassStatus.ACTIVE, ClassStatus.PAUSED],
        })
        .andWhere('class.endDate IS NOT NULL')
        .andWhere('class.endDate <= :now', { now })
        .andWhere('class.deletedAt IS NULL')
        .getMany();

      let activatedCount = 0;
      let finishedCount = 0;

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

        activatedCount = classesToActivate.length;
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

        finishedCount = classesToFinish.length;
      }

      const duration = Date.now() - startTime;

      if (activatedCount > 0 || finishedCount > 0) {
        this.logger.log('Class status update completed', {
          activatedCount,
          finishedCount,
          duration,
          timestamp: now.toISOString(),
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
