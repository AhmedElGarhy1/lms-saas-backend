import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventOrCommandName,
  EventOrCommandPayload,
} from '../events/event-type-map';

/**
 * Type-safe event emitter wrapper around EventEmitter2.
 *
 * Ensures compile-time type safety for event/command emissions:
 * - emitAsync<T>() requires payload type to match event name
 * - Prevents incorrect payload types from being emitted
 *
 * Usage:
 * ```typescript
 * await this.eventEmitter.emitAsync(
 *   UserCommands.CREATE,
 *   new CreateUserCommand(dto, actor, targetProfileId, targetProfileType)
 * );
 * ```
 */
@Injectable()
export class TypeSafeEventEmitter {
  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Emit an event/command asynchronously with type safety.
   *
   * @param eventName - The event/command name from UnifiedTypeMap
   * @param payload - The payload matching the event/command name's type
   * @returns Promise that resolves when all listeners have been called
   */
  async emitAsync<T extends EventOrCommandName>(
    eventName: T,
    payload: EventOrCommandPayload<T>,
  ): Promise<unknown[]> {
    return this.eventEmitter.emitAsync(eventName, payload);
  }

  /**
   * Emit an event/command synchronously with type safety.
   *
   * @param eventName - The event/command name from UnifiedTypeMap
   * @param payload - The payload matching the event/command name's type
   * @returns True if event had listeners, false otherwise
   */
  emit<T extends EventOrCommandName>(
    eventName: T,
    payload: EventOrCommandPayload<T>,
  ): boolean {
    return this.eventEmitter.emit(eventName, payload);
  }

  /**
   * Add a listener for an event/command with type safety.
   *
   * @param eventName - The event/command name from UnifiedTypeMap
   * @param listener - The listener function that receives the typed payload
   */
  on<T extends EventOrCommandName>(
    eventName: T,
    listener: (payload: EventOrCommandPayload<T>) => void,
  ): void {
    this.eventEmitter.on(eventName, listener);
  }

  /**
   * Remove a listener for an event/command.
   *
   * @param eventName - The event/command name from UnifiedTypeMap
   * @param listener - The listener function to remove
   */
  off<T extends EventOrCommandName>(
    eventName: T,
    listener: (payload: EventOrCommandPayload<T>) => void,
  ): void {
    this.eventEmitter.off(eventName, listener);
  }
}
