import { ActorUser } from '../types/actor-user.type';
import { RequestContext } from '../context/request.context';
import { randomUUID } from 'crypto';

/**
 * Base class for all commands.
 * Commands represent intentions (what we want to do) and are input-oriented.
 */
export abstract class BaseCommand {
  public readonly actor: ActorUser;
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(actor: ActorUser) {
    this.actor = actor;
    this.correlationId = randomUUID();
    this.timestamp = new Date();
    this.requestId = RequestContext.get()?.requestId;
  }
}





