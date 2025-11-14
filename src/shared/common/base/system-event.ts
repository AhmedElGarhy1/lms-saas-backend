/**
 * Base class for system events that don't have an actor.
 * System events represent facts initiated by the system (not by a user).
 * Examples: password reset requests (public endpoint), OTP sent (public).
 *
 * Note: correlationId is not part of events. It's generated internally
 * by services that process events (e.g., notifications module).
 */
export abstract class SystemEvent {
  public readonly timestamp: Date;

  constructor() {
    this.timestamp = new Date();
  }
}

