import { EventType } from '@/shared/events';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationEventsMap } from '../config/notifications.map';
import { ValidateEventForNotification } from './event-validation.types';

/**
 * Get NotificationType for a given EventType
 */
export type NotificationTypeForEvent<T extends EventType> =
  T extends keyof typeof NotificationEventsMap
    ? (typeof NotificationEventsMap)[T] extends { type: infer N }
      ? N
      : never
    : never;

/**
 * Type-safe event validation helper
 * Validates event has all properties required by its notification type
 */
export type ValidateEvent<TEvent, TEventType extends EventType> =
  NotificationTypeForEvent<TEventType> extends NotificationType
    ? ValidateEventForNotification<TEvent, NotificationTypeForEvent<TEventType>>
    : TEvent; // If event type not mapped, allow any event
