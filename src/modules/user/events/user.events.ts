import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CreateUserWithRoleDto } from '../dto/create-user.dto';

export enum UserEvents {
  CREATE = 'user.create',
  UPDATE = 'user.update',
  DELETE = 'user.delete',
  RESTORE = 'user.restore',
  ACTIVATE = 'user.activate',
}

export class CreateUserEvent {
  constructor(
    public readonly dto: CreateUserWithRoleDto,
    public readonly actor: ActorUser,
    public readonly targetProfileId: string,
    public readonly targetProfileType: ProfileType,
  ) {}
}

export class UpdateUserEvent {
  constructor(
    public readonly userId: string,
    public readonly updates: UpdateUserDto,
    public readonly actor: ActorUser,
  ) {}
}

export class DeleteUserEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class RestoreUserEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class ActivateUserEvent {
  constructor(
    public readonly userId: string,
    public readonly isActive: boolean,
    public readonly actor: ActorUser,
  ) {}
}
