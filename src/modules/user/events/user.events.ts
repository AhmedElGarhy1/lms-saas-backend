import { User } from '@/modules/user/entities/user.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';

export enum UserEvents {
  CREATED = 'user.created',
  UPDATED = 'user.updated',
  DELETED = 'user.deleted',
  RESTORED = 'user.restored',
  ACTIVATED = 'user.activated',
}

export class UserCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly actor: ActorUser,
  ) {}
}

export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly updates: UpdateUserDto,
    public readonly actor: ActorUser,
  ) {}
}

export class UserDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class UserRestoredEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class UserActivatedEvent {
  constructor(
    public readonly userId: string,
    public readonly isActive: boolean,
    public readonly actor: ActorUser,
  ) {}
}
