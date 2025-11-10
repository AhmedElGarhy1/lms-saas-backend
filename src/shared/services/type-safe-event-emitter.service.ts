import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventName,
  EventPayload,
} from '../events/event-type-map';

/**
 * Type-safe event emitter wrapper around EventEmitter2.
 *
 * Ensures compile-time type safety for event emissions:
 * - emitAsync<T>() requires payload type to match event name
 * - Prevents incorrect payload types from being emitted
 *
 * Usage:
 * ```typescript
 * await this.eventEmitter.emitAsync(
 *   UserEvents.CREATED,
 *   new UserCreatedEvent(user, profile, actor)
 * );
 * ```
 */
@Injectable()
export class TypeSafeEventEmitter {
  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Emit an event asynchronously with type safety.
   *
   * @param eventName - The event name from EventTypeMap
   * @param payload - The payload matching the event name's type
   * @returns Promise that resolves when all listeners have been called
   */
  async emitAsync<T extends EventName>(
    eventName: T,
    payload: EventPayload<T>,
  ): Promise<unknown[]> {
    return this.eventEmitter.emitAsync(eventName, payload);
  }

  /**
   * Emit an event synchronously with type safety.
   *
   * @param eventName - The event name from EventTypeMap
   * @param payload - The payload matching the event name's type
   * @returns True if event had listeners, false otherwise
   */
  emit<T extends EventName>(
    eventName: T,
    payload: EventPayload<T>,
  ): boolean {
    return this.eventEmitter.emit(eventName, payload);
  }

  /**
   * Add a listener for an event with type safety.
   *
   * @param eventName - The event name from EventTypeMap
   * @param listener - The listener function that receives the typed payload
   */
  on<T extends EventName>(
    eventName: T,
    listener: (payload: EventPayload<T>) => void,
  ): void {
    this.eventEmitter.on(eventName, listener);
  }

  /**
   * Remove a listener for an event.
   *
   * @param eventName - The event name from EventTypeMap
   * @param listener - The listener function to remove
   */
  off<T extends EventName>(
    eventName: T,
    listener: (payload: EventPayload<T>) => void,
  ): void {
    this.eventEmitter.off(eventName, listener);
  }
}
