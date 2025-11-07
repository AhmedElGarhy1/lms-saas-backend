import { NotificationType } from '../enums/notification-type.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { EventType } from '@/shared/events';

/**
 * Simple mapping from EventType to NotificationType
 * All other configuration (channels, priority, group, templates) comes from manifests
 */
export interface NotificationEventMapping {
  type: NotificationType; // Only field - maps event to notification type
}

/**
 * Default notification mapping used when event is not found in NotificationEventsMap
 */
export const DEFAULT_NOTIFICATION_MAPPING: NotificationEventMapping = {
  type: NotificationType.CENTER_UPDATED,
};

/**
 * Helper function to determine log level and priority for unmapped events
 * @param eventName - The event name that was not mapped
 * @returns Object with log level and priority (priority can be derived: 0-1=info, 2-3=success, 4-5=warning, 6-7=error)
 */
export function getUnmappedEventLogLevel(eventName: EventType | string): {
  logLevel: 'info' | 'warn' | 'error';
  priority: number;
} {
  const upperEventName = eventName.toUpperCase();

  // Security events: WARN (priority 4)
  if (
    upperEventName.includes('AUTH') ||
    upperEventName.includes('SECURITY') ||
    upperEventName.includes('PASSWORD') ||
    upperEventName.includes('OTP') ||
    upperEventName.includes('VERIFICATION')
  ) {
    return { logLevel: 'warn', priority: 4 };
  }

  // Deletions: WARN (priority 4)
  if (upperEventName.includes('DELETE') || upperEventName.includes('REMOVE')) {
    return { logLevel: 'warn', priority: 4 };
  }

  // System critical: ERROR (priority 6)
  if (
    upperEventName.includes('SYSTEM') ||
    upperEventName.includes('CRITICAL') ||
    upperEventName.includes('FAILURE') ||
    upperEventName.includes('ERROR')
  ) {
    return { logLevel: 'error', priority: 6 };
  }

  // Default: INFO (priority 0)
  return { logLevel: 'info', priority: 0 };
}

/**
 * Maps domain events to notification configurations.
 *
 * Note: NotificationType is kept for:
 * - Database storage (stored in notification.type column)
 * - API responses (returns notification type to clients)
 * - Backward compatibility
 *
 * EventType is used as keys for type safety and to ensure we catch typos at compile time.
 * Using Partial<Record> allows optional mappings - not all events need notifications.
 */
/**
 * Maps domain events to notification types.
 * All other configuration (channels, priority, group, templates) comes from manifests.
 */
export const NotificationEventsMap: Partial<
  Record<EventType, NotificationEventMapping>
> = {
  // 🏫 CENTER EVENTS
  [CenterEvents.CREATED]: {
    type: NotificationType.CENTER_CREATED,
  },
  [CenterEvents.UPDATED]: {
    type: NotificationType.CENTER_UPDATED,
  },

  // 🔐 AUTH EVENTS
  [AuthEvents.PASSWORD_RESET_REQUESTED]: {
    type: NotificationType.PASSWORD_RESET,
  },
  [AuthEvents.EMAIL_VERIFICATION_REQUESTED]: {
    type: NotificationType.EMAIL_VERIFICATION,
  },
  [AuthEvents.OTP_SENT]: {
    type: NotificationType.OTP_SENT,
  },
};
