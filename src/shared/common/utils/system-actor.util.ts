import { ActorUser } from '../types/actor-user.type';
import { SYSTEM_ACTOR } from '../constants/system-actor.constant';

/**
 * Creates a system actor for use in cronjobs and automated system operations.
 * System actors represent actions performed by the system rather than by a real user.
 * Uses the fixed SYSTEM_USER_ID to maintain referential integrity in the database.
 *
 * @param centerId - The center ID associated with the operation (optional, but recommended for most operations)
 * @returns An ActorUser object representing the system actor with the fixed system user UUID
 *
 * @example
 * const systemActor = createSystemActor(classEntity.centerId);
 * await this.typeSafeEventEmitter.emitAsync(EventName, new Event(data, systemActor, centerId));
 */
export function createSystemActor(centerId?: string): ActorUser {
  return {
    ...SYSTEM_ACTOR,
    centerId: centerId,
  } as ActorUser;
}
