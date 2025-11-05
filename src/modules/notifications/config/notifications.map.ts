import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { NotificationActionType } from '../enums/notification-action-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { EventType } from '@/shared/events';

export interface NotificationEventMapping {
  type: NotificationType;
  channels:
    | NotificationChannel[]
    | Partial<Record<ProfileType, NotificationChannel[]>>;
  template: string;
  group: NotificationGroup;
  priority?: number; // 1-10 (higher = more urgent)
  localized?: boolean; // use i18n template if true
  actionType?: NotificationActionType; // for IN_APP notifications
  requiresAudit?: boolean; // for security events
}

/**
 * Default notification mapping used when event is not found in NotificationEventsMap
 */
export const DEFAULT_NOTIFICATION_MAPPING: NotificationEventMapping = {
  type: NotificationType.USER_REGISTERED, // Using USER_REGISTERED as generic fallback
  channels: [NotificationChannel.IN_APP],
  template: 'default',
  group: NotificationGroup.SYSTEM,
  priority: 1,
};

/**
 * Resolve channels for a given mapping and profile type
 * @param mapping - Notification event mapping
 * @param profileType - Optional profile type for profile-scoped mappings
 * @returns Array of notification channels
 */
export function resolveChannels(
  mapping: NotificationEventMapping,
  profileType?: ProfileType | null,
): NotificationChannel[] {
  // If channels is an array, it's user-level (not profile-scoped)
  if (Array.isArray(mapping.channels)) {
    return mapping.channels;
  }

  // If channels is an object, it's profile-scoped
  if (profileType && mapping.channels[profileType]) {
    return mapping.channels[profileType];
  }

  // Fallback to IN_APP if profile type not found or not provided
  return [NotificationChannel.IN_APP];
}

/**
 * Safe version of resolveChannels that handles undefined/null mappings
 * @param mapping - Optional notification event mapping
 * @param profileType - Optional profile type for profile-scoped mappings
 * @returns Array of notification channels (defaults to IN_APP if mapping is undefined)
 */
export function resolveChannelsSafe(
  mapping?: NotificationEventMapping,
  profileType?: ProfileType | null,
): NotificationChannel[] {
  if (!mapping) {
    return [NotificationChannel.IN_APP];
  }
  return resolveChannels(mapping, profileType);
}

/**
 * Check if mapping is profile-scoped (channels is an object)
 * @param mapping - Notification event mapping
 * @returns true if profile-scoped, false otherwise
 */
export function isProfileScoped(mapping: NotificationEventMapping): boolean {
  return !Array.isArray(mapping.channels);
}

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
export const NotificationEventsMap: Partial<
  Record<EventType, NotificationEventMapping>
> = {
  // 👤 USER EVENTS
  [UserEvents.CREATED]: {
    type: NotificationType.USER_REGISTERED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
    template: 'user-registered',
    group: NotificationGroup.SYSTEM,
    priority: 1,
  },
  [UserEvents.UPDATED]: {
    type: NotificationType.USER_UPDATED,
    channels: [NotificationChannel.IN_APP],
    template: 'user-updated',
    group: NotificationGroup.SYSTEM,
  },
  [UserEvents.DELETED]: {
    type: NotificationType.USER_DELETED,
    channels: [NotificationChannel.IN_APP],
    template: 'user-deleted',
    group: NotificationGroup.SYSTEM,
  },
  [UserEvents.RESTORED]: {
    type: NotificationType.USER_RESTORED,
    channels: [NotificationChannel.IN_APP],
    template: 'user-restored',
    group: NotificationGroup.SYSTEM,
  },
  [UserEvents.ACTIVATED]: {
    type: NotificationType.USER_ACTIVATED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
    template: 'user-activated',
    group: NotificationGroup.SYSTEM,
    priority: 2,
  },

  // 🏫 CENTER EVENTS
  [CenterEvents.CREATED]: {
    type: NotificationType.CENTER_CREATED,
    channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP], // sent to center contact + admins
    template: 'center-created',
    group: NotificationGroup.MANAGEMENT,
    priority: 3,
    requiresAudit: true,
  },
  [CenterEvents.UPDATED]: {
    type: NotificationType.CENTER_UPDATED,
    channels: {
      [ProfileType.ADMIN]: [NotificationChannel.IN_APP],
      [ProfileType.STAFF]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    },
    template: 'center-updated',
    group: NotificationGroup.MANAGEMENT,
  },
  [CenterEvents.DELETED]: {
    type: NotificationType.CENTER_DELETED,
    channels: {
      [ProfileType.ADMIN]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
      [ProfileType.STAFF]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    },
    template: 'center-deleted',
    group: NotificationGroup.MANAGEMENT,
    priority: 7,
  },
  [CenterEvents.RESTORED]: {
    type: NotificationType.CENTER_RESTORED,
    channels: {
      [ProfileType.ADMIN]: [NotificationChannel.IN_APP],
      [ProfileType.STAFF]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    },
    template: 'center-restored',
    group: NotificationGroup.MANAGEMENT,
  },

  // 🌿 BRANCH EVENTS
  [BranchEvents.CREATED]: {
    type: NotificationType.BRANCH_CREATED,
    channels: {
      [ProfileType.STAFF]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    },
    template: 'branch-created',
    group: NotificationGroup.MANAGEMENT,
  },
  [BranchEvents.UPDATED]: {
    type: NotificationType.BRANCH_UPDATED,
    channels: {
      [ProfileType.STAFF]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    },
    template: 'branch-updated',
    group: NotificationGroup.MANAGEMENT,
  },
  [BranchEvents.DELETED]: {
    type: NotificationType.BRANCH_DELETED,
    channels: {
      [ProfileType.STAFF]: [
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    },
    template: 'branch-deleted',
    group: NotificationGroup.MANAGEMENT,
    priority: 6,
  },

  // 🔐 AUTH EVENTS
  [AuthEvents.PASSWORD_RESET_REQUESTED]: {
    type: NotificationType.PASSWORD_RESET,
    channels: [NotificationChannel.SMS, NotificationChannel.EMAIL],
    template: 'auth/password-reset',
    group: NotificationGroup.SECURITY,
    priority: 3,
  },
  [AuthEvents.EMAIL_VERIFICATION_REQUESTED]: {
    type: NotificationType.EMAIL_VERIFICATION,
    channels: [NotificationChannel.EMAIL],
    template: 'auth/email-verification',
    group: NotificationGroup.SECURITY,
    priority: 3,
  },
  [AuthEvents.OTP_SENT]: {
    type: NotificationType.OTP_SENT,
    channels: [NotificationChannel.SMS, NotificationChannel.IN_APP],
    template: 'auth/otp-sent',
    group: NotificationGroup.SECURITY,
    priority: 4,
  },
};
