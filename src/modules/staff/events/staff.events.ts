import { Staff } from '@/modules/staff/entities/staff.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { BaseEvent } from '@/shared/common/base/base-event';

export class CreateStaffEvent {
  constructor(
    public readonly user: User,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
    public readonly staff: Staff,
    public readonly centerId?: string,
    public readonly roleId?: string,
    public readonly isCenterAccessActive?: boolean,
  ) {}
}

export class StaffCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
    public readonly staff: Staff,
    public readonly centerId?: string,
    public readonly roleId?: string,
  ) {}
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that staff data was exported.
 */
export class StaffExportedEvent extends BaseEvent {
  constructor(
    public readonly format: string,
    public readonly filename: string,
    public readonly recordCount: number,
    public readonly filters: Record<string, any>,
    actor: ActorUser,
  ) {
    super(actor);
  }
}
