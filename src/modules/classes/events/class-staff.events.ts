import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Class } from '../entities/class.entity';

/**
 * Event emitted when a staff member is assigned to a class
 */
export class StaffAssignedToClassEvent {
  constructor(
    public readonly staffUserProfileId: string,
    public readonly classEntity: Class,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

/**
 * Event emitted when a staff member is removed from a class
 */
export class StaffRemovedFromClassEvent {
  constructor(
    public readonly staffUserProfileId: string,
    public readonly classId: string,
    public readonly className: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}
