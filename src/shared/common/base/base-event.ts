import { ActorUser } from '../types/actor-user.type';

/**
 * Base class for all domain events.
 * Events represent facts (what happened) and are result-oriented.
 *
 * Note: correlationId is not part of events. It's generated internally
 * by services that process events (e.g., notifications module).
 */
export abstract class BaseEvent {
  public readonly actor: ActorUser;
  public readonly timestamp: Date;

  constructor(actor: ActorUser) {
    this.actor = actor;
    this.timestamp = new Date();
  }
}
