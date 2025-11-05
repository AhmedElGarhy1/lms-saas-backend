import { ActorUser } from '../types/actor-user.type';
import { randomUUID } from 'crypto';

/**
 * Base class for all domain events.
 * Events represent facts (what happened) and are result-oriented.
 */
export abstract class BaseEvent {
  public readonly actor?: ActorUser;
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly source?: string;

  constructor(actor?: ActorUser, source?: string, correlationId?: string) {
    this.actor = actor;
    this.correlationId = correlationId || randomUUID(); // Use provided correlationId or generate new one
    this.timestamp = new Date();
    this.source = source;
  }
}

