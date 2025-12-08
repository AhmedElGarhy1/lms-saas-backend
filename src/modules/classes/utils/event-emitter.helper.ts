import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import { ClassCreatedEvent, ClassUpdatedEvent } from '../events/class.events';
import { GroupCreatedEvent, GroupUpdatedEvent } from '../events/group.events';
import { Class } from '../entities/class.entity';
import { Group } from '../entities/group.entity';

/**
 * Helper utility for type-safe event emission in the classes module.
 * Eliminates the need for type casting when emitting events.
 */
export class EventEmitterHelper {
  /**
   * Emit a class created or updated event with type safety.
   *
   * @param typeSafeEventEmitter - The type-safe event emitter instance
   * @param eventType - The event type (CREATED or UPDATED)
   * @param classEntity - The class entity to emit
   * @param actor - The actor performing the action
   * @param centerId - The center ID
   */
  static async emitClassEvent(
    typeSafeEventEmitter: TypeSafeEventEmitter,
    eventType: ClassEvents.CREATED | ClassEvents.UPDATED,
    classEntity: Class,
    actor: { userProfileId: string; centerId?: string | null },
    centerId: string,
  ): Promise<void> {
    if (eventType === ClassEvents.CREATED) {
      await typeSafeEventEmitter.emitAsync(
        ClassEvents.CREATED,
        new ClassCreatedEvent(classEntity, actor, centerId),
      );
    } else {
      await typeSafeEventEmitter.emitAsync(
        ClassEvents.UPDATED,
        new ClassUpdatedEvent(classEntity, actor, centerId),
      );
    }
  }

  /**
   * Emit a group created or updated event with type safety.
   *
   * @param typeSafeEventEmitter - The type-safe event emitter instance
   * @param eventType - The event type (CREATED or UPDATED)
   * @param group - The group entity to emit
   * @param classEntity - The class entity (required for CREATED event)
   * @param actor - The actor performing the action
   * @param centerId - The center ID
   */
  static async emitGroupEvent(
    typeSafeEventEmitter: TypeSafeEventEmitter,
    eventType: GroupEvents.CREATED | GroupEvents.UPDATED,
    group: Group,
    classEntity: Class | null,
    actor: { userProfileId: string; centerId?: string | null },
    centerId: string,
  ): Promise<void> {
    if (eventType === GroupEvents.CREATED) {
      if (!classEntity) {
        throw new Error('Class entity is required for GroupCreatedEvent');
      }
      await typeSafeEventEmitter.emitAsync(
        GroupEvents.CREATED,
        new GroupCreatedEvent(group, classEntity, actor, centerId),
      );
    } else {
      await typeSafeEventEmitter.emitAsync(
        GroupEvents.UPDATED,
        new GroupUpdatedEvent(group, actor, centerId),
      );
    }
  }
}


