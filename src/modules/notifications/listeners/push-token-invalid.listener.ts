import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationEvents } from '@/shared/events/notification.events.enum';
import { PushTokenInvalidEvent } from '../events/notification.events';
import { UserDevice } from '@/modules/user/entities/user-device.entity';

/**
 * Handles PUSH_TOKEN_INVALID: clears invalid FCM tokens from user_devices.
 * Run outside request context (emitted from queue worker); uses DataSource transaction.
 */
@Injectable()
export class PushTokenInvalidListener {
  private readonly logger = new Logger(PushTokenInvalidListener.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent(NotificationEvents.PUSH_TOKEN_INVALID)
  async handlePushTokenInvalid(event: PushTokenInvalidEvent): Promise<void> {
    const { token, userId } = event;

    try {
      await this.dataSource.manager.transaction(async (em) => {
        const repo = em.getRepository(UserDevice);
        const device = await repo.findOne({
          where: { userId, fcmToken: token },
        });
        if (!device) return;
        await repo.update(device.id, { fcmToken: null });
        this.logger.log(
          `Cleared invalid FCM token for user ${userId}, device ${device.id}`,
        );
      });
    } catch (err) {
      this.logger.error(
        `Failed to clear invalid FCM token: userId=${userId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
