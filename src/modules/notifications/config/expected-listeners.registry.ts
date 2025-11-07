import { EventType } from '@/shared/events';
import { REQUIRED_NOTIFICATION_EVENTS } from './required-events.registry';

/**
 * Events that should have @OnEvent listeners in NotificationListener
 * Should match REQUIRED_NOTIFICATION_EVENTS (all mapped events need listeners)
 */
export const EXPECTED_LISTENER_EVENTS: readonly EventType[] = [
  ...REQUIRED_NOTIFICATION_EVENTS,
] as const;
