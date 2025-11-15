import { User } from '@/modules/user/entities/user.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class CreateAdminEvent {
  constructor(
    public readonly user: User,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
    public readonly admin: Admin,
    public readonly roleId?: string,
  ) {}
}

export class AdminCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
    public readonly admin: Admin,
    public readonly roleId?: string,
  ) {}
}
