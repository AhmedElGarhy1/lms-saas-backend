import { EventType } from '@/shared/events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';

/**
 * Events that require notification mappings
 * If an event is in this list but not in NotificationEventsMap, validation will fail
 */
export const REQUIRED_NOTIFICATION_EVENTS: readonly EventType[] = [
  // Auth events that should trigger notifications
  AuthEvents.OTP_SENT,
  AuthEvents.PASSWORD_RESET_REQUESTED,
  AuthEvents.EMAIL_VERIFICATION_REQUESTED,

  // Center events that should trigger notifications
  CenterEvents.CREATED,
  CenterEvents.UPDATED,
] as const;
