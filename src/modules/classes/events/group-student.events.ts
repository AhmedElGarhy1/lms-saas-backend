import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Group } from '../entities/group.entity';

/**
 * Event emitted when a student is added to a group
 */
export class StudentAddedToGroupEvent {
  constructor(
    public readonly studentUserProfileId: string,
    public readonly group: Group,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

/**
 * Event emitted when a student is removed from a group
 */
export class StudentRemovedFromGroupEvent {
  constructor(
    public readonly studentUserProfileId: string,
    public readonly groupId: string,
    public readonly groupName: string,
    public readonly className: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}
