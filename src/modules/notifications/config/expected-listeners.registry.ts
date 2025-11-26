import { EventType } from '@/shared/events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';

/**
 * Events that should have @OnEvent listeners in NotificationListener
 * Note: This is for documentation/validation purposes only.
 * All handlers now use trigger() directly with NotificationType.
 */
export const EXPECTED_LISTENER_EVENTS: readonly EventType[] = [
  // Auth events that should trigger notifications
  AuthEvents.OTP,
  AuthEvents.PHONE_VERIFIED,

  // Center events that should trigger notifications
  CenterEvents.CREATED,
  CenterEvents.UPDATED,
] as const;
