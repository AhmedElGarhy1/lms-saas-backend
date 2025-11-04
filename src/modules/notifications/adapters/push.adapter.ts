import { Injectable } from '@nestjs/common';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Injectable()
export class PushAdapter implements NotificationAdapter {
  async send(payload: NotificationPayload): Promise<void> {
    if (payload.channel !== NotificationChannel.PUSH) {
      throw new Error('PushAdapter can only send PUSH notifications');
    }

    // TODO: Implement Push notification sending via Firebase Cloud Messaging
    throw new Error('Push adapter not yet implemented');
  }
}
