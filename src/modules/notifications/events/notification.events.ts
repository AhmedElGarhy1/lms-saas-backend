import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../entities/notification.entity';

/**
 * Event emitted when a notification is created
 */
export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
  ) {}
}

/**
 * Event emitted when a notification is successfully delivered
 */
export class NotificationDeliveredEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly channel: NotificationChannel,
    public readonly status: NotificationStatus,
    public readonly attempts?: number,
    public readonly latencyMs?: number,
  ) {}
}

/**
 * Event emitted when a notification delivery fails
 */
export class NotificationFailedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly channel: NotificationChannel,
    public readonly status: NotificationStatus,
    public readonly error?: string,
    public readonly attempts?: number,
  ) {}
}

/**
 * Event emitted when a notification is marked as read
 */
export class NotificationReadEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly readAt: Date,
    public readonly createdAt: Date,
    public readonly readTime: number | null,
  ) {}
}
