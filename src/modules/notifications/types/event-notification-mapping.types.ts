import { EventType } from '@/shared/events';

/**
 * Type-safe event validation helper
 *
 * Note: Event-to-notification mapping has been removed.
 * All handlers now use trigger() directly with NotificationType.
 * This type is kept for backward compatibility but is now a simple passthrough.
 */
export type ValidateEvent<TEvent, TEventType extends EventType> = TEvent;
