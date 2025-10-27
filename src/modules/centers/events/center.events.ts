import { Center } from '@/modules/centers/entities/center.entity';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { UpdateCenterRequestDto } from '@/modules/centers/dto/update-center.dto';

export enum CenterEvents {
  CREATED = 'center.created',
  UPDATED = 'center.updated',
  DELETED = 'center.deleted',
  RESTORED = 'center.restored',
  OWNER_ASSIGNED = 'center.owner.assigned',
}

export class CenterCreatedEvent {
  constructor(
    public readonly center: Center,
    public readonly userData: CreateUserDto,
    public readonly actor: ActorUser,
  ) {}
}

export class CenterUpdatedEvent {
  constructor(
    public readonly centerId: string,
    public readonly updates: Partial<UpdateCenterRequestDto>,
    public readonly actor: ActorUser,
  ) {}
}

export class CenterDeletedEvent {
  constructor(
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class CenterRestoredEvent {
  constructor(
    public readonly centerId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class CenterOwnerAssignedEvent {
  constructor(
    public readonly center: Center,
    public readonly userProfile: UserProfile,
    public readonly actor: ActorUser,
  ) {}
}
