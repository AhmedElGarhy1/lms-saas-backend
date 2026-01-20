import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { BaseEvent } from '@/shared/common/base/base-event';

export class CreateTeacherEvent {
  constructor(
    public readonly user: User,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
    public readonly teacher: Teacher,
    public readonly centerId?: string,
    public readonly isCenterAccessActive?: boolean,
  ) {}
}
