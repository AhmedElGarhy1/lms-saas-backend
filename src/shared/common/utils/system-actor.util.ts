import { ActorUser } from '../types/actor-user.type';
import { ProfileType } from '../enums/profile-type.enum';

/**
 * Creates a system actor for use in cronjobs and automated system operations.
 * System actors represent actions performed by the system rather than by a real user.
 *
 * @param centerId - The center ID associated with the operation (optional, but recommended for most operations)
 * @returns An ActorUser object representing the system actor
 *
 * @example
 * const systemActor = createSystemActor(classEntity.centerId);
 * await this.typeSafeEventEmitter.emitAsync(EventName, new Event(data, systemActor, centerId));
 */
export function createSystemActor(centerId?: string): ActorUser {
  return {
    id: 'system',
    userProfileId: 'system',
    profileType: null as unknown as ProfileType, // System actor doesn't have a profile type
    centerId: centerId,
  } as ActorUser;
}

